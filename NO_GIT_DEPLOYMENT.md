# Deploy ETIFT Employee Portal Without Git

## Option 1: Deploy via Railway (Easiest - No Git Needed)

1. **Go to https://railway.app** and sign up (free account)

2. **Upload project as ZIP**:
   - Download/ZIP your entire ETIFT-Employee-Portal folder
   - In Railway, click "New Project" → "Deploy from Repo"
   - OR use Railway CLI (no Git required):
     ```bash
     npm install -g @railway/cli
     railway login
     cd C:\Users\aaami\OneDrive\Documents\ETIFT-Employee-Portal
     railway init
     railway up
     ```

3. **Set Environment Variables** in Railway dashboard:
   ```
   JWT_SECRET = etift_secret_key_2026
   SESSION_SECRET = etift_session_secret
   NODE_ENV = production
   PORT = 5000
   ```

4. **Deploy** → Get permanent URL (e.g., `https://etift-portal-123.railway.app`)

---

## Option 2: Deploy via Fly.io (CLI-based, No Git)

1. **Install Fly CLI**: https://fly.io/docs/getting-started/installing-flyctl/

2. **Sign up at https://fly.io** (free)

3. **Deploy**:
   ```bash
   cd C:\Users\aaami\OneDrive\Documents\ETIFT-Employee-Portal
   flyctl auth login
   flyctl launch --name etift-employee-portal
   flyctl deploy
   ```

4. **Set secrets**:
   ```bash
   flyctl secrets set JWT_SECRET=etift_secret_key_2026
   flyctl secrets set SESSION_SECRET=etift_session_secret
   ```

5. **Get URL**: `https://etift-employee-portal.fly.dev`

---

## Option 3: Use Docker Locally + Push to Docker Hub

1. **Install Docker**: https://www.docker.com/products/docker-desktop

2. **Build and run locally**:
   ```bash
   cd C:\Users\aaami\OneDrive\Documents\ETIFT-Employee-Portal
   docker build -t etift-portal .
   docker run -p 5000:5000 -e JWT_SECRET=etift_secret_key_2026 -e SESSION_SECRET=etift_session_secret etift-portal
   ```

3. **Push to Docker Hub**:
   ```bash
   docker login
   docker tag etift-portal YOUR_DOCKERHUB_USERNAME/etift-portal
   docker push YOUR_DOCKERHUB_USERNAME/etift-portal
   ```

4. **Deploy from Docker Hub** to Railway/Render/Fly

---

## Recommended: Railway (Easiest No-Git Option)

Go to https://railway.app → Sign up → Use Railway CLI tool:

```bash
npm install -g @railway/cli
railway login
cd C:\Users\aaami\OneDrive\Documents\ETIFT-Employee-Portal
railway init
railway up
```

Done. You get a **permanent URL** in minutes.

---

**After Deployment:**
- Test login: admin@etift.com / admin123
- Test employee: aster.bekele@etift.com / welcome123
- Share the permanent URL with your company
- No tunnel, no crashes — it stays live 24/7
