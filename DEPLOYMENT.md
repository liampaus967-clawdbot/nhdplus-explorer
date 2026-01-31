# 🚀 Deployment Guide

## Security Checklist

### ✅ Already Implemented
- [x] **Environment variables** — All secrets use `process.env`, nothing hardcoded
- [x] **Rate limiting** — 60 requests/minute per IP on all API routes
- [x] **Input validation** — Coordinate bounds checking, sanitization
- [x] **Security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [x] **.gitignore** — Covers `.env`, `.env.local`, `node_modules/`, `.next/`
- [x] **No secrets in git history** — Verified clean

### ⚠️ Production Configuration Required

#### 1. Environment Variables
Set these on your hosting platform:

```env
# Required
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxx    # Your Mapbox public token
DATABASE_URL=postgresql://...         # Your PostgreSQL connection string

# Recommended
ALLOWED_ORIGIN=https://yourdomain.com  # Lock down CORS (default is *)
```

#### 2. Mapbox Token Security
Your `NEXT_PUBLIC_MAPBOX_TOKEN` is intentionally client-exposed (Mapbox requires this). Secure it by:
- **URL restrictions** — In Mapbox dashboard, restrict token to your domain(s)
- **Scope restrictions** — Only enable required scopes (styles:read, fonts:read, etc.)
- **Separate tokens** — Use different tokens for dev/prod

#### 3. Database Security
- Use **SSL connections** (the code auto-enables for RDS)
- Create a **read-only user** for the app if possible
- **Firewall** the database to only allow connections from your server

#### 4. CORS Lock-down
Edit `next.config.js` or set `ALLOWED_ORIGIN` env var:
```javascript
value: process.env.ALLOWED_ORIGIN || 'https://yourdomain.com'
```

---

## Deployment Options

### Option A: Vercel (Recommended for Next.js)
```bash
npm i -g vercel
vercel
```
- Set environment variables in Vercel dashboard
- Serverless PostgreSQL: Use Vercel Postgres, Neon, or Supabase
- Note: Current DB is AWS RDS — you'll need to whitelist Vercel IPs or use a connection pooler

### Option B: Self-hosted (VPS/EC2)
```bash
npm run build
npm start
```
- Use nginx as reverse proxy
- Set up SSL with Let's Encrypt
- Use PM2 for process management

### Option C: Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Environment File Template

Create `.env.local` (never commit this):
```env
# Mapbox (get from mapbox.com/account/access-tokens)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...

# PostgreSQL with PostGIS
DATABASE_URL=postgresql://user:password@host:5432/database

# Optional: Lock down CORS
ALLOWED_ORIGIN=https://yourdomain.com
```

---

## Public Assets (Expected to be visible)

These are intentionally public:
- **Mapbox tileset URLs** (`mapbox://lman967.xxxxx`) — Access controlled by token, not URL
- **API endpoints** (`/api/snap`, `/api/route`) — Protected by rate limiting

---

## Pre-deployment Checklist

- [ ] Set all environment variables on hosting platform
- [ ] Restrict Mapbox token to production domain(s)
- [ ] Verify database is accessible from hosting platform
- [ ] Test API endpoints work after deployment
- [ ] Verify CORS is locked to your domain
- [ ] Set up monitoring/alerting (optional but recommended)

---

## Monitoring (Optional)

Consider adding:
- **Vercel Analytics** — Built-in if using Vercel
- **Sentry** — Error tracking
- **Database monitoring** — AWS CloudWatch if using RDS
