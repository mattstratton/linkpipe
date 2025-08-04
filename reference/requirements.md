
# LinkPipe - URL Shortener with UTM Manager (AWS Low-Cost Architecture)

## 🧰 Requirements

### Functional
- Support multiple custom domain names for redirection
- Preserve and pass along all referrers and headers to the destination URL
- Shorten URLs using unique slugs
- Web interface for managing short links
- Add UTM parameters to links (select from predefined list or add ad hoc)
- Centralized UTM parameter list with support for customization
- Redirect service for handling short links
- Basic analytics (future phase)

### Non-Functional
- Minimal cost infrastructure (ideally under $1/month)
- Serverless and scalable
- Easy deployment (CI/CD optional)
- Secure (admin access for link management)

---

## 🧱 Tech Stack

### Frontend
- **React (Vite)**: Lightweight and fast dev experience
- **Hosting Options**:
  - **S3 + CloudFront** (cheapest)
  - **AWS Amplify** (more features, slightly higher cost)

### Backend
- **AWS Lambda** via API Gateway
- **DynamoDB**: Serverless NoSQL database
- **S3 Static Hosting** or **Lambda@Edge** for redirection

### Optional Tools
- **Pulumi / Terraform / AWS CDK**: Infrastructure as Code
- **CloudWatch**: Logging and basic monitoring
- **GitHub Actions**: CI/CD

---

## 🌐 Architecture Overview

```
[React Frontend] --> [API Gateway] --> [Lambda Functions]
                                      |-> [DynamoDB for URL and UTM storage]

[Short URL] --> [Redirect Domain] --> [Lambda@Edge or S3 redirect logic] --> [Final Destination with UTM]
```

---

## 🔧 Implementation Plan

### Phase 1: MVP
- [ ] Static React site with form to create/edit short URLs
- [ ] Lambda:
  - `POST /shorten` to save short links
  - `GET /r/{slug}` to handle redirection
- [ ] UTM Builder with:
  - Dropdown for predefined UTM values
  - Input fields for ad hoc values
- [ ] DynamoDB Schema:
  ```json
  {
    "slug": "abc123",
    "url": "https://example.com",
    "utm_params": {
      "utm_source": "newsletter",
      "utm_medium": "email"
    },
    "createdAt": "2025-08-04T12:00:00Z",
    "tags": ["campaign1"]
  }
  ```

### Phase 2: Management UI
- [ ] Dashboard to list/edit/delete links
- [ ] Bulk import/export support (CSV/JSON)
- [ ] Link expiration option

### Phase 3: Enhancements
- [ ] Basic click analytics
- [ ] QR code generation
- [ ] Authentication (Cognito or password gate)

---

## 💰 Cost Estimates

| Component       | Service                  | Est. Monthly Cost |
|----------------|---------------------------|--------------------|
| Hosting         | S3 + CloudFront           | ~$0.01–$0.10       |
| Backend         | Lambda + API Gateway      | ~$0.00 (Free Tier) |
| Database        | DynamoDB                  | ~$0.00–$1.00       |
| Domain & DNS    | Route 53                  | ~$0.50             |
| CI/CD           | GitHub Actions / Amplify  | Free Tier          |

> ⚠️ Total Estimated Cost: **<$1/month** for low usage

---

## 🛠 Tooling Summary

| Purpose        | Tool/Service      |
|----------------|------------------|
| Frontend       | React + Vite     |
| Hosting        | S3 + CloudFront  |
| Backend        | AWS Lambda       |
| Database       | DynamoDB         |
| Auth (optional)| Cognito          |
| CI/CD          | GitHub Actions   |
| Infra as Code  | Pulumi / Terraform / CDK |
