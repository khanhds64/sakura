# Run the Project with Docker

1. Copy `.env.example` to a new file named `.env`.

2. Set the values for the following environment variables in your `.env` file:

   ```env
   POSTGRES_USER=xxxx
   POSTGRES_PASSWORD=abcdfgh
   POSTGRES_DB=revenue_db
   ```

3. Generate a JWT secret by running the following command in your terminal.
   Copy the generated value into `JWT_SECRET` in your `.env` file.
   Set `JWT_EXPIRES_IN` to specify the token's expiration time. For example, `3d` means the token expires after 3 days.

   ```bash
   openssl rand -base64 32
   ```

   Example:

   ```env
   JWT_SECRET=xxxx
   JWT_EXPIRES_IN=3d
   ```

4. The system has two roles:
   - **staff:** Can only view the dashboard.
   - **admin:** Can access the management page to create and edit data displayed on the dashboard.

   Set an email and password for each role in your `.env` file. These credentials are used to create the initial accounts.

   ```env
   ADMIN_EMAIL=
   ADMIN_PASSWORD=

   STAFF_EMAIL=
   STAFF_PASSWORD=
   ```

5. Install Docker Desktop or OrbStack, a lightweight alternative for macOS.
   - [Docker Desktop for macOS](https://docs.docker.com/desktop/setup/install/mac-install/)
   - [Download OrbStack](https://orbstack.dev/download)

6. Open your IDE's terminal and navigate to the `sakura` project directory.
   Then, run the following command to build the project images and starts the three services defined in the Docker: db, migration, and backend.

   ```bash
   docker compose up --build -d
   ```

7. Run the following command to create the admin and staff accounts using the credentials configured in your `.env` file:

   ```bash
   docker compose exec backend npm run seed:user
   ```

   Once the accounts have been seeded successfully, the database and backend are ready for use. You can start the frontend and log in through the UI.

   Refer to the frontend's README for instructions on starting the frontend application.
