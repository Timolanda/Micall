# Deployment Checklist

## Pre-deployment

- [ ] Update all environment variables in `.env`
- [ ] Test all API endpoints
- [ ] Run all unit and integration tests
- [ ] Check database migrations
- [ ] Update SSL certificates
- [ ] Backup current database

## Domain and SSL

- [ ] Configure domain DNS settings
- [ ] Install SSL certificates in `ssl/` directory
  - `fullchain.pem`
  - `privkey.pem`

## Server Requirements

- [ ] Install Docker (20.10+)
- [ ] Install Docker Compose (2.0+)
- [ ] Open ports 80 and 443
- [ ] Configure firewall rules
- [ ] Set up monitoring
- [ ] Configure backup system

## Deployment Steps

1. SSH into the server
2. Clone the repository
3. Copy `.env` file
4. Copy SSL certificates
5. Run deployment script:
   ```bash
   chmod +x deploy/deploy.sh
   ./deploy/deploy.sh
   ```

## Post-deployment

- [ ] Verify health check endpoint
- [ ] Test WebSocket connections
- [ ] Verify database connections
- [ ] Check Redis connection
- [ ] Test donation system
- [ ] Verify SSL certificate
- [ ] Test user authentication
- [ ] Monitor error logs
