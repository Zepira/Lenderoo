# Deployment Guide for Lenderoo

This guide covers how to deploy your Expo/React Native app using GitHub Actions.

## Prerequisites

1. **Expo Account**: Sign up at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install globally with `npm install -g eas-cli`
3. **GitHub Repository**: Push your code to GitHub

## Setup Instructions

### 1. Initialize EAS in Your Project

```bash
# Login to Expo
eas login

# Initialize EAS
eas build:configure

# Create update configuration
eas update:configure
```

### 2. Create Expo Access Token

1. Go to [expo.dev/accounts/[your-username]/settings/access-tokens](https://expo.dev/accounts/[your-username]/settings/access-tokens)
2. Click "Create Token"
3. Name it "GitHub Actions"
4. Copy the token (you won't see it again!)

### 3. Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:
   - Name: `EXPO_TOKEN`
   - Value: Paste the token from step 2

### 4. Configure EAS Build Profiles

Create or update `eas.json` in your project root:

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {}
  },
  "update": {
    "preview": {
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  }
}
```

## GitHub Actions Workflows

Four workflows have been created:

### 1. **expo-deploy.yml** - Classic Expo Publish
- Triggers on push to main/master
- Publishes to Expo's classic hosting
- Good for development/testing

### 2. **expo-eas-build.yml** - EAS Build
- Manual trigger via GitHub Actions UI
- Builds native apps (iOS/Android)
- Choose platform and profile when running
- Produces installable builds

### 3. **expo-update.yml** - EAS Update (OTA)
- Triggers on push to main/master
- Sends over-the-air updates to existing builds
- Fast updates without rebuilding
- Good for JS/asset changes

### 4. **expo-web.yml** - GitHub Pages Deployment
- Deploys web version to GitHub Pages
- Triggers on push to main/master
- See custom domain section below

## Usage

### Deploy OTA Update
```bash
git push origin main
# Automatically triggers expo-update.yml
```

### Manual Build
1. Go to GitHub Actions tab
2. Select "EAS Build and Submit"
3. Click "Run workflow"
4. Choose platform (all/android/ios) and profile
5. Click "Run workflow"

### Deploy Web Version
1. Enable GitHub Pages in repository settings
2. Push to main branch
3. Access at `https://[username].github.io/[repo-name]`

## Custom Domain Setup

### For Web Deployment (GitHub Pages)

1. **Add CNAME file** to your project root:
```bash
echo "yourdomain.com" > CNAME
```

2. **Update app.json** to include your domain:
```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "output": "static"
    },
    "assetBundlePatterns": [
      "**/*"
    ]
  }
}
```

3. **Configure DNS** (at your domain registrar):

For apex domain (yourdomain.com):
```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

For www subdomain:
```
Type: CNAME
Name: www
Value: [your-github-username].github.io
```

4. **Enable Custom Domain in GitHub**:
   - Go to Settings → Pages
   - Enter your custom domain
   - Enable "Enforce HTTPS"

5. **Update expo-web.yml** workflow to preserve CNAME:

```yaml
- name: Export web build
  run: |
    npx expo export --platform web
    cp CNAME dist/CNAME
```

### For Native Apps (Custom Deep Links)

1. **Update app.json**:
```json
{
  "expo": {
    "scheme": "lenderoo",
    "web": {
      "bundler": "metro"
    },
    "ios": {
      "bundleIdentifier": "com.yourdomain.lenderoo",
      "associatedDomains": ["applinks:yourdomain.com"]
    },
    "android": {
      "package": "com.yourdomain.lenderoo",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "https",
              "host": "yourdomain.com"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

2. **Set up Universal Links (iOS)**:
   - Create `.well-known/apple-app-site-association` on your domain
   - Configure associated domains in Apple Developer Console

3. **Set up App Links (Android)**:
   - Create `.well-known/assetlinks.json` on your domain
   - Get SHA256 fingerprint from Play Console

## EAS Update Channels

### Development Flow:
1. **preview** channel: For testing (`eas update --branch preview`)
2. **production** channel: For production releases (`eas update --branch production`)

### Best Practices:
- Use preview channel for staging/QA
- Use production channel only for released apps
- Test updates thoroughly before production deploy

## Monitoring Deployments

### Check EAS Updates:
```bash
eas update:list --branch preview
```

### Check EAS Builds:
```bash
eas build:list
```

### View Build Logs:
```bash
eas build:view [build-id]
```

## Troubleshooting

### Build Fails:
- Check Expo token is valid in GitHub Secrets
- Ensure eas.json is properly configured
- Review build logs in EAS dashboard

### Update Not Showing:
- Check update channel matches app configuration
- Ensure runtime versions are compatible
- Force refresh the app

### Custom Domain Not Working:
- DNS propagation can take 24-48 hours
- Verify CNAME file exists in dist folder
- Check GitHub Pages settings

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [GitHub Pages Custom Domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Expo Web Deployment](https://docs.expo.dev/distribution/publishing-websites/)

## Security Notes

- Never commit Expo tokens to your repository
- Use GitHub Secrets for sensitive data
- Rotate tokens periodically
- Use different tokens for different environments
