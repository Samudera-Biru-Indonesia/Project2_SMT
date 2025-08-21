# Deployment Instructions for SMT Truck App

## Problem
When refreshing Angular routes like `https://smxapp.samator.com/truck/scan-barcode`, the page redirects to the domain root instead of staying on the intended page.

## Solution

### Files to Deploy:

1. **All files from `dist/project2-smt/browser/`** should be uploaded to `/truck/` folder on your server
2. **Additional `.htaccess` for server root** (if you have access)

### Server Configuration:

#### For Apache Server:

1. **In `/truck/` folder** (where your Angular app files are):
   ```apache
   Options -MultiViews
   RewriteEngine On

   # Handle Angular Client-Side Routing for /truck/ subfolder
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /truck/index.html [L]
   ```

2. **In server root** (optional, if you have access):
   ```apache
   RewriteEngine On

   # Handle requests to /truck/ subfolder
   RewriteCond %{REQUEST_URI} ^/truck/(.*)$
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^truck/(.*)$ /truck/index.html [L]
   ```

#### For IIS Server:
The `web.config` file is already configured and will be deployed automatically.

### Deployment Steps:

1. Run: `ng build --configuration=production`
2. Upload all files from `dist/project2-smt/browser/` to your server's `/truck/` directory
3. If you have access to server root, also upload `root.htaccess` as `.htaccess` in the server root
4. Ensure your server has mod_rewrite enabled (for Apache)

### Testing:
- Visit: `https://smxapp.samator.com/truck/scan-barcode`
- Refresh the page
- Should stay on the scan-barcode page instead of redirecting to domain root

### Troubleshooting:
- If still redirecting to root, check if there's a conflicting `.htaccess` in server root
- Ensure mod_rewrite is enabled on your Apache server
- Check server error logs for rewrite rule conflicts
