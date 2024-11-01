Here’s an updated `README.md` with your name included for attribution.

---

## README

# Product and Category Management Bot API

This API, designed for integration with a Telegram bot, facilitates product and category management. It supports CRUD operations on products and categories with historical tracking for each interaction, including product updates and sales.

### Project Features
- **CRUD Operations**: Full CRUD capabilities for products and categories.
- **Historical Tracking**: Each product and category change is logged, maintaining a history for auditing.
- **Balance Updates**: User balances can be updated, with each adjustment logged for tracking purposes.
- **Category Validation**: Each product must belong to an existing category, ensuring data integrity.

---

### Table of Contents
1. [Setup](#setup)
2. [Bot Commands](#bot-commands)
3. [API Endpoints](#api-endpoints)
4. [Database Models](#database-models)
5. [Testing with Postman](#testing-with-postman)

---

### 1. Setup

#### Prerequisites
- **Node.js** and **npm**
- **MongoDB** instance
- **Telegram Bot Token** (from [BotFather](https://core.telegram.org/bots#botfather))

#### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo-name.git
   cd your-repo-name
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in a `.env` file:
   ```plaintext
   BOT_TOKEN=your_telegram_bot_token
   MONGODB_URI=your_mongodb_uri
   PORT=3000
   ```

4. Start the server:
   ```bash
   npm start
   ```

---

### 2. Bot Commands

The bot is configured to listen for specific commands:

- **/start**: Shows a welcome message and main menu options.
- **Balance Check**: Shows the user’s current balance.
- **View Products by Category**: Lists available products filtered by category.
- **Purchase Product**: Initiates a purchase flow.
- **Support**: Provides contact options for customer support.

---

### 3. API Endpoints

| Method | Endpoint                  | Description                    |
|--------|----------------------------|--------------------------------|
| GET    | `/users`                  | Retrieves all users            |
| GET    | `/users/:id`              | Retrieves a user by ID         |
| PUT    | `/users/:id`              | Updates a user’s balance       |
| DELETE | `/users/:id`              | Deletes a user by ID           |
| GET    | `/categories`             | Retrieves all categories       |
| GET    | `/categories/:id`         | Retrieves a category by ID     |
| POST   | `/categories`             | Creates a new category         |
| PUT    | `/categories/:id`         | Updates a category by ID       |
| DELETE | `/categories/:id`         | Deletes a category by ID       |
| GET    | `/products`               | Retrieves all products         |
| GET    | `/products/:id`           | Retrieves a product by ID      |
| POST   | `/products`               | Creates a new product          |
| PUT    | `/products/:id`           | Updates a product by ID        |
| DELETE | `/products/:id`           | Deletes a product by ID        |

#### Endpoint Details

1. **GET /users**: Returns all users.
   - **Example Response**:
     ```json
     [
       {
         "_id": "5f8d04f6b54764421b716b35",
         "telegramId": "123456789",
         "username": "johndoe",
         "balance": 100,
         "history": []
       }
     ]
     ```

2. **PUT /users/:id**: Updates a user’s balance and adds a log entry.
   - **Request Body**:
     ```json
     {
       "balance": 50
     }
     ```

3. **GET /categories**: Returns all categories.
   - **Example Response**:
     ```json
     [
       {
         "_id": "5f8d04f6b54764421b716b35",
         "name": "Electronics",
         "categoryHistory": []
       }
     ]
     ```

4. **POST /products**: Creates a new product.
   - **Request Body**:
     ```json
     {
       "name": "Product Name",
       "description": "Product Description",
       "price": 100,
       "emails": ["example@example.com"],
       "categoryId": "5f8d04f6b54764421b716b35",
       "password": "securepassword"
     }
     ```

---

### 4. Database Models

#### User
- **_id**: Unique identifier.
- **telegramId**: User’s Telegram ID.
- **username**: User’s Telegram username.
- **balance**: User’s balance.
- **history**: Array of history entries (e.g., charges, purchases).

#### Product
- **_id**: Unique identifier.
- **name**: Product name.
- **description**: Product description.
- **price**: Price of the product.
- **emails**: List of associated emails.
- **categoryId**: Category ID the product belongs to.
- **password**: Shared password for associated emails.
- **productHistory**: Array tracking all updates, sales, and changes.

#### Category
- **_id**: Unique identifier.
- **name**: Name of the category.
- **categoryHistory**: Array of history entries tracking changes.

---

### 5. Testing with Postman

1. **Import Collection**: Load the provided Postman collection (found in the `/postman` folder).
2. **Environment Variables**:
   - `{{baseUrl}}`: Set to `http://localhost:3000`.
   - `{{userId}}`, `{{productId}}`, `{{categoryId}}`: Set as needed for each request.

Each endpoint in the collection includes sample requests and expected responses.

---

### Contributions

Developed by [Guenfoude Oussama (Jeogo Oussama)](https://github.com/jeogo-oussama). Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

---

### License

This project is licensed under the MIT License.

---

This `README.md` includes setup instructions, usage examples, and developer attribution for **Guenfoude Oussama (Jeogo Oussama)**. Let me know if there’s anything else to add!