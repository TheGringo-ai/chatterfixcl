# ChatterFix

ChatterFix is a full-stack application designed to streamline work order management. It features a React frontend and a Python FastAPI backend, enabling technicians to create, manage, and track work orders, including the ability to upload photos and communicate via an integrated AI chat.

## Features

*   **Work Order Management:** Create, view, update, and delete work orders.
*   **Photo Uploads:** Attach images to work orders for better documentation.
*   **AI Chat:** An integrated chat feature for real-time communication and assistance.
*   **Document Storage:** Securely store and retrieve documents related to work orders.
*   **Search and Filtering:** Easily find documents and work orders with powerful search capabilities.

## Tech Stack

*   **Frontend:** React, TypeScript, Tailwind CSS
*   **Backend:** Python, FastAPI
*   **Database:** Google Firestore
*   **Storage:** Google Cloud Storage

## Getting Started

### Prerequisites

*   Node.js and npm
*   Python 3.8+ and pip
*   Google Cloud SDK

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/TheGringo-ai/chatterfixcl.git
    cd chatterfixcl
    ```

2.  **Install frontend dependencies:**
    ```sh
    npm install
    ```

3.  **Install backend dependencies:**
    ```sh
    pip install -r requirements.txt
    ```
    *(Note: You may need to create a `requirements.txt` file first based on the Python scripts.)*

### Running the Application

1.  **Start the frontend development server:**
    ```sh
    npm start
    ```
    The frontend will be available at `http://localhost:3000`.

2.  **Start the backend API server:**
    ```sh
    uvicorn docker.api.main:app --reload
    ```
    The API will be available at `http://localhost:8000`.

## API Endpoints

The following are the main API endpoints available:

*   `POST /upload`: Upload a document.
*   `GET /documents`: Retrieve a list of documents.
*   `GET /search`: Search for documents.
*   `DELETE /documents/{document_id}`: Delete a document.
*   `POST /documents/{document_id}/signed-url`: Generate a signed URL for a document.

For more details, you can access the auto-generated API documentation at `http://localhost:8000/docs`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

This project is licensed under a proprietary license. See the `LICENSE` file for details.
