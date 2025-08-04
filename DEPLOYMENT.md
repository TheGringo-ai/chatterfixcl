# ChatterFix Deployment Guide

This guide provides step-by-step instructions for deploying the ChatterFix application, including the backend API to Google Cloud Run and the frontend to Netlify.

## Prerequisites

Before you begin, ensure you have the following installed and configured:

1.  **Google Cloud SDK:** [Install gcloud](https://cloud.google.com/sdk/docs/install) and authenticate with your Google account (`gcloud auth login`).
2.  **Node.js and npm:** [Install Node.js](https://nodejs.org/) (which includes npm).
3.  **Netlify CLI:** Install globally via npm: `npm install -g netlify-cli`.
4.  **A Google Cloud Project:** Create a new project in the [Google Cloud Console](https://console.cloud.google.com/).

---

## Backend Deployment (Google Cloud Run)

The backend is a FastAPI application packaged in a Docker container and deployed as a serverless service on Google Cloud Run.

### Steps:

1.  **Navigate to the Docker Directory:**
    Open your terminal and change to the `docker` directory within the project.
    ```bash
    cd /path/to/your/project/chatterfixcl/docker
    ```

2.  **Run the Deployment Script:**
    Execute the `deploy.sh` script, passing your Google Cloud Project ID as the first argument.

    ```bash
    bash deploy.sh YOUR_PROJECT_ID
    ```
    *Replace `YOUR_PROJECT_ID` with your actual Google Cloud Project ID.*

    This script automates the following:
    *   **Enables APIs:** Activates necessary Google Cloud services (Cloud Run, Cloud Build, etc.).
    *   **Creates Storage:** Sets up a Google Cloud Storage bucket for document uploads.
    *   **Initializes Firestore:** Prepares Firestore for metadata storage.
    *   **Builds Docker Image:** Uses Google Cloud Build to create a Docker image from the `Dockerfile`.
    *   **Deploys to Cloud Run:** Pushes the image to Google Container Registry and deploys it to Cloud Run.

3.  **Get the Service URL:**
    Once the deployment is complete, the script will output the **Service URL**. This is the public endpoint for your backend API. Copy this URL for the next steps.

---

## Frontend Deployment (Netlify)

The frontend is a React application that needs to be connected to the deployed backend.

### Steps:

1.  **Update Environment Variables:**
    In the root directory of the project, create or update your `.env` file with the backend Service URL you copied from the previous step.

    ```
    REACT_APP_LLAMA_API_URL=https://your-cloud-run-service-url.a.run.app
    REACT_APP_STORAGE_API_URL=https://your-cloud-run-service-url.a.run.app
    ```
    *Replace the URL with your actual backend service URL.*

2.  **Build the Application:**
    Generate a production-ready build of the React app.
    ```bash
    npm run build
    ```
    This command creates an optimized `build` directory.

3.  **Deploy to Netlify:**
    Deploy the `build` directory to Netlify. The `--prod` flag pushes it to your main production site.
    ```bash
    netlify deploy --prod --dir=build
    ```

    Follow the prompts from the Netlify CLI to link the site to your Netlify account if you haven't already.

---

## Completion

Your ChatterFix application is now fully deployed!

*   **Frontend:** Accessible via your Netlify URL.
*   **Backend:** Running on Google Cloud Run.

You can now visit your Netlify site to use the live application.
