# ETIFT Employee Portal - Deployment Guide

This guide shows how to deploy the ETIFT Employee Portal to a public hosting service.

## Option 1: Deploy to Render (Recommended - Free & Easy)

1. **Sign up at https://render.com** (free account)

2. **Push your code to GitHub** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial ETIFT Employee Portal commit"
   git remote add origin https://github.com/alamin-8/ETIFT-Employee-Portal.git
   git push -u origin main
   ```

3. **Connect to Render**:
   - Go to https://dashboard.render.com/new/web
   - Connect your GitHub account
   - Select the ETIFT-Employee-Portal repository
   - Render will auto-detect the project (it reads `render.yaml`)
   - Click "Deploy"

4. **Set Environment Variables**:
   - In Render dashboard, go to your service
   - Go to "Environment" section
   - Add these variables:
     ```
     SESSION_SECRET=your-secure-random-string-here
     JWT_SECRET=your-secure-random-string-here
     ```

5. **Wait for deployment** (usually 2-3 minutes)

6. **Your app will be live at**: https://etift-employee-portal.onrender.com (or your chosen name)

---

## Option 2: Deploy to Railway.app

1. **Sign up at https://railway.app** (free account)

2. **Push your code to GitHub**

3. **In Railway Dashboard**:
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Select the ETIFT-Employee-Portal repo
   - Railway will auto-detect Node.js and create a deployment

4. **Set Environment Variables**:
   - Go to "Variables" tab
   - Add `SESSION_SECRET` and `JWT_SECRET`

5. **Your app will be live** with a public URL

---

## Option 3: Deploy to Heroku (May require credit card)

1. **Install Heroku CLI** and sign up at https://www.heroku.com

2. **Push to GitHub and connect**

3. **Deploy via Heroku CLI**:
   ```bash
   heroku login
   heroku create etift-employee-portal
   git push heroku main
   heroku config:set SESSION_SECRET=your-secret
   heroku config:set JWT_SECRET=your-secret
   ```

4. **Your app will be live** at https://etift-employee-portal.herokuapp.com

---

## After Deployment

- Test all features (login, employee dashboard, admin page, QR attendance, etc.)
- Share the public URL with your company
- Default credentials still work:
  - Admin: admin@etift.com / admin123
  - Employee: aster.bekele@etift.com / welcome123

---

## Important Notes

- **Database**: The app uses SQLite (etift.db), which is fine for small teams. If you need more users/data, upgrade to PostgreSQL later.
- **Secrets**: Never commit `.env` files. Always set secrets in your hosting platform's environment variables.
- **Free Tier**: Render and Railway offer free deployment, but with limitations (sleeping after inactivity). Upgrade to paid if needed for always-on.

---

## Troubleshooting

**App not starting?**
- Check the logs in your hosting platform dashboard
- Ensure NODE_ENV is not set to `development`
- Check that PORT is not hardcoded (should use `process.env.PORT`)

**Database issues?**
- SQLite works on free tiers, but if you need persistence, switch to PostgreSQL on Render/Railway

---

## Next Steps

After deployment, consider:
- Custom domain (optional)
- SSL/HTTPS (automatic on Render/Railway)
- Backup and scaling for more employees
