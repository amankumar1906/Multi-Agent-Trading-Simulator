# AI Investment Agents - Setup Guide

## 📋 **Required API Keys & Accounts**

### 1. Google Gemini API (FREE) ✅
**What**: AI model for sentiment analysis  
**Cost**: FREE (1,500 requests/day)  
**Setup**:
1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API key" 
4. Copy key → Add to `.env` as `GEMINI_API_KEY`

---

### 2. Supabase Database (FREE) ✅  
**What**: PostgreSQL database for storing trades & performance  
**Cost**: FREE (500MB database)  
**Setup**:
1. Go to: https://supabase.com
2. Sign up → Create new project
3. Go to Settings → API → Copy these values:
   - **Project URL** → `SUPABASE_URL` 
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`
4. Go to SQL Editor → Paste & run `database/schema.sql`
5. Verify tables are created in Table Editor

---

### 3. AWS Account (FREE tier) ✅
**What**: Lambda functions + API Gateway + CloudWatch scheduling  
**Cost**: FREE (1M Lambda requests/month)  
**Setup**:
1. Go to: https://aws.amazon.com → Create account
2. Go to IAM → Users → Create new user → Add permissions:
   - `AWSLambdaFullAccess`
   - `AmazonAPIGatewayAdministrator` 
   - `CloudWatchEventsFullAccess`
3. Create Access Key → Copy:
   - **Access Key ID** → `AWS_ACCESS_KEY_ID`
   - **Secret Access Key** → `AWS_SECRET_ACCESS_KEY`

---

### 4. Vercel Account (FREE) ✅
**What**: Frontend hosting  
**Cost**: FREE (100GB bandwidth)  
**Setup**:
1. Go to: https://vercel.com
2. Sign up with GitHub
3. We'll connect this to your repo later

---

## 🗂️ **Environment Variables Setup**

Copy your API keys to the `.env` file:

```bash
# 1. Google Gemini AI
GEMINI_API_KEY=your_key_here

# 2. Supabase  
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# 3. AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=abcd...
AWS_REGION=us-east-1

# 4. Frontend (same Supabase values)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co  
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

---

## 🧪 **Testing Setup**

Once you have API keys, test the setup:

```bash
# Install dependencies
npm install
cd lambda && npm install && cd ..

# Test all services
cd lambda && node test-local.js
```

**Expected Output**: All services should show ✅ (green checkmarks)

---

## 🚀 **AWS Deployment Guide**

### Step 1: Install AWS CLI

**Windows:**
1. Download: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run installer → Follow prompts
3. Open **new** Command Prompt/PowerShell
4. Test: `aws --version`

**macOS:**
```bash
brew install awscli
# OR download from: https://awscli.amazonaws.com/AWSCLIV2.pkg
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Step 2: Configure AWS CLI

```bash
aws configure
```

**Enter your AWS credentials:**
- **AWS Access Key ID**: `AKIA...` (from your .env file)
- **AWS Secret Access Key**: `kxeb...` (from your .env file)  
- **Default region**: `us-east-1`
- **Default output format**: `json`

**Test configuration:**
```bash
aws sts get-caller-identity
```
Should show your AWS account info.

### Step 3: Create Lambda Deployment Package

```bash
# Build TypeScript
cd lambda
npm run build

# Create deployment package
zip -r ../ai-investment-agent.zip . -x "*.ts" "tsconfig.json" "test-local.js"
cd ..
```

### Step 4: Deploy Lambda Function

```bash
# Create Lambda function
aws lambda create-function \
  --function-name ai-investment-agent \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler index.dailyExecution \
  --zip-file fileb://ai-investment-agent.zip \
  --timeout 300 \
  --memory-size 512 \
  --environment Variables="{GEMINI_API_KEY=$GEMINI_API_KEY,SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY}"
```

**Note**: Replace `YOUR_ACCOUNT_ID` with your actual AWS Account ID

### Step 5: Create IAM Role for Lambda

```bash
# Create trust policy file
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name lambda-execution-role \
  --assume-role-policy-document file://trust-policy.json

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### Step 6: Set Up CloudWatch Schedule (2 PM ET Daily)

```bash
# Create CloudWatch rule for 2 PM ET (18:00 UTC)
aws events put-rule \
  --name ai-agent-daily-trigger \
  --schedule-expression "cron(0 18 * * ? *)" \
  --description "Trigger AI investment agent daily at 2 PM ET"

# Add Lambda as target
aws lambda add-permission \
  --function-name ai-investment-agent \
  --statement-id allow-cloudwatch \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:YOUR_ACCOUNT_ID:rule/ai-agent-daily-trigger

# Connect rule to Lambda
aws events put-targets \
  --rule ai-agent-daily-trigger \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:ai-investment-agent"
```

### Step 7: Create API Gateway (Optional - for manual testing)

```bash
# Create REST API
aws apigateway create-rest-api \
  --name ai-investment-agent-api \
  --description "API for AI Investment Agents"

# Get API ID from output, then create resources and methods
# (This step is optional - mainly for testing via HTTP)
```

### Step 8: Test Lambda Function

```bash
# Test the function manually
aws lambda invoke \
  --function-name ai-investment-agent \
  --payload '{}' \
  response.json

# View response
cat response.json
```

**Expected**: Should see agent execution results and trades made.

### Step 9: Monitor Logs

```bash
# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/ai-investment-agent

# Tail logs in real-time
aws logs tail /aws/lambda/ai-investment-agent --follow
```

---

## 🎯 **Frontend Deployment (Vercel)**

### Step 1: Create Frontend

```bash
# We'll create the dashboard in next step
npm run dev  # Will run locally first
```

### Step 2: Connect to Vercel

1. Go to: https://vercel.com/dashboard
2. Click "New Project"  
3. Import from GitHub → Select your repo
4. **Environment Variables** (in Vercel dashboard):
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
5. Click "Deploy"

---

## 📋 **Complete Checklist**

### ✅ **Phase 1: Setup** 
- [x] Google Gemini API key
- [x] Supabase project & database schema  
- [x] AWS IAM user & access keys
- [x] Environment variables in `.env`
- [x] Local testing (all services ✅)

### 🔄 **Phase 2: AWS Deployment**
- [ ] Install & configure AWS CLI
- [ ] Create IAM role for Lambda
- [ ] Deploy Lambda function  
- [ ] Set up CloudWatch daily trigger
- [ ] Test Lambda execution

### 🔄 **Phase 3: Frontend**
- [ ] Create dashboard UI
- [ ] Deploy to Vercel
- [ ] Test end-to-end system

### 🔄 **Phase 4: Monitoring**
- [ ] Verify daily execution at 2 PM ET
- [ ] Monitor agent performance
- [ ] Add more agents (earnings, news, etc.)

---

## 💰 **Cost Breakdown (All FREE)**

| Service | Free Tier | Our Usage | Status |
|---------|-----------|-----------|--------|
| **Gemini API** | 1,500 requests/day | ~50 requests/day | ✅ FREE |
| **Supabase** | 500MB database | <100MB | ✅ FREE |  
| **AWS Lambda** | 1M requests/month | ~30 requests/month | ✅ FREE |
| **Vercel** | 100GB bandwidth | <1GB | ✅ FREE |
| **Total Cost** | **$0.00/month** | **$0.00/month** | ✅ FREE |

---

## 🆘 **Troubleshooting**

**Common Issues:**

1. **"Access Denied" errors**: Check IAM permissions
2. **Lambda timeout**: Increase timeout to 300 seconds  
3. **Environment variables missing**: Set in Lambda console
4. **Supabase connection fails**: Check URL and keys
5. **Gemini API 404**: Use `gemini-1.5-flash` model name

**Get Help:**
- AWS Lambda logs: CloudWatch → Log Groups
- Test locally first: `cd lambda && node test-local.js`
- Supabase logs: Dashboard → Logs section

Next: Follow AWS CLI setup and deployment steps above! 🚀