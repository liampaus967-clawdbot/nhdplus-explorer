#!/usr/bin/env python3
"""
Load flow percentiles from S3 reference_stats into PostgreSQL flow_percentiles table.

The S3 data has daily percentiles (366 rows per gauge). This script aggregates
them into annual median percentiles for the flow_percentiles table.
"""
import os
import sys
import boto3
import pandas as pd
import psycopg2
from io import BytesIO

# Database config
DB_CONFIG = {
    'host': 'driftwise-dev.ck52oyeoe285.us-east-1.rds.amazonaws.com',
    'dbname': 'driftwise',
    'user': 'driftwise',
    'password': os.environ.get('DB_PASSWORD', 'Pacific1ride')
}

# S3 config
S3_BUCKET = 'driftwise-flowgauge-data'
S3_PREFIX = 'reference_stats/'

def get_s3_client():
    """Get boto3 S3 client using driftwise profile"""
    session = boto3.Session(profile_name='driftwise')
    return session.client('s3')

def list_state_files(s3):
    """List all state parquet files in S3"""
    paginator = s3.get_paginator('list_objects_v2')
    files = []
    for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=S3_PREFIX):
        for obj in page.get('Contents', []):
            if obj['Key'].endswith('data.parquet'):
                files.append(obj['Key'])
    return files

def load_parquet_from_s3(s3, key):
    """Load a parquet file from S3 into pandas"""
    response = s3.get_object(Bucket=S3_BUCKET, Key=key)
    return pd.read_parquet(BytesIO(response['Body'].read()))

def aggregate_to_annual(df):
    """
    Aggregate daily percentiles to annual medians.
    
    Input columns: site_id, month_day, p05, p10, p25, p50, p75, p90, p95, min, max, mean, count
    Output columns: site_id, p10, p25, p50, p75, p90, min_flow, max_flow
    """
    # Group by site_id and take median of each percentile
    agg = df.groupby('site_id').agg({
        'p10': 'median',
        'p25': 'median',
        'p50': 'median',
        'p75': 'median',
        'p90': 'median',
        'min': 'min',  # Absolute min across all days
        'max': 'max',  # Absolute max across all days
    }).reset_index()
    
    # Rename columns to match table
    agg = agg.rename(columns={'min': 'min_flow', 'max': 'max_flow'})
    
    return agg

def upsert_percentiles(conn, df):
    """Upsert percentile records into flow_percentiles table"""
    cursor = conn.cursor()
    
    # Use ON CONFLICT for upsert
    sql = """
        INSERT INTO flow_percentiles (site_id, p10, p25, p50, p75, p90, min_flow, max_flow)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (site_id) DO UPDATE SET
            p10 = EXCLUDED.p10,
            p25 = EXCLUDED.p25,
            p50 = EXCLUDED.p50,
            p75 = EXCLUDED.p75,
            p90 = EXCLUDED.p90,
            min_flow = EXCLUDED.min_flow,
            max_flow = EXCLUDED.max_flow
    """
    
    count = 0
    for _, row in df.iterrows():
        cursor.execute(sql, (
            row['site_id'],
            None if pd.isna(row['p10']) else row['p10'],
            None if pd.isna(row['p25']) else row['p25'],
            None if pd.isna(row['p50']) else row['p50'],
            None if pd.isna(row['p75']) else row['p75'],
            None if pd.isna(row['p90']) else row['p90'],
            None if pd.isna(row['min_flow']) else row['min_flow'],
            None if pd.isna(row['max_flow']) else row['max_flow'],
        ))
        count += 1
    
    conn.commit()
    cursor.close()
    return count

def main():
    print("Loading S3 reference stats into flow_percentiles table...")
    
    # Connect to S3 and database
    s3 = get_s3_client()
    conn = psycopg2.connect(**DB_CONFIG)
    
    # List all state files
    files = list_state_files(s3)
    print(f"Found {len(files)} state files in S3")
    
    total_gauges = 0
    
    for i, key in enumerate(files):
        state = key.split('state=')[1].split('/')[0]
        print(f"[{i+1}/{len(files)}] Processing {state}...", end=' ', flush=True)
        
        try:
            # Load parquet
            df = load_parquet_from_s3(s3, key)
            
            # Aggregate to annual
            agg = aggregate_to_annual(df)
            
            # Upsert to database
            count = upsert_percentiles(conn, agg)
            total_gauges += count
            print(f"{count} gauges")
            
        except Exception as e:
            print(f"ERROR: {e}")
            continue
    
    conn.close()
    print(f"\nDone! Loaded {total_gauges} gauge percentiles into database.")

if __name__ == '__main__':
    main()
