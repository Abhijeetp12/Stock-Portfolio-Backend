import dotenv from "dotenv";
dotenv.config();

import express from "express";
import axios from "axios";
import pool from "../Config/db.js";

const stockRoutes=express();
const API_URL=process.env.API_URL;
const API_KEY=process.env.API_KEY;

stockRoutes.post("/stock", async (req, res) => {
  const inputName = req.body.StockName;
  const userId = req.user.id;
  console.log(userId);
  console.log(inputName);

  try {
    const normalizedInput = inputName.trim().toUpperCase();

    // Check if the stock is already added for this user
    const existingStock = await pool.query(
      'SELECT * FROM "Stock_portfolio".user_stocks WHERE user_id=$1 AND UPPER(stock_name) LIKE $2',
      [userId, `%${normalizedInput}%`]
    );

    if (existingStock.rowCount > 0) {
      return res.status(409).json({ error: "Stock already added" });
    }

    // Check if the user has reached the stock limit (5 stocks)
    const userStocks = await pool.query(
      'SELECT * FROM "Stock_portfolio".user_stocks WHERE user_id=$1',
      [userId]
    );

    console.log("Stock Array Length:", userStocks.rowCount);
    if (userStocks.rowCount >= 5) {
      return res.status(403).json({ error: "Stock Limit Reached" });
    }

    console.log("Stock Data:", userStocks.rows); // Log stock objects

    // Fetch stock details from Alpha Vantage API
    const response = await axios.get(
      `${API_URL}/query?function=SYMBOL_SEARCH&keywords=${normalizedInput}&apikey=${API_KEY}`
    );
    console.log(response.data.bestMatches?.[0]);

    if (!response.data.bestMatches || response.data.bestMatches.length === 0) {
      return res.status(404).json({ error: "Stock not found" });
    }

    const stock = response.data.bestMatches[0];
    const stockName = stock["2. name"];
    let stockSymbol = stock["1. symbol"];

    if (stockSymbol.includes(".BSE")) {
      var cleanedSymbol = stockSymbol.replace(".BSE", "");
      console.log(cleanedSymbol); // Output: "Reliance"
    }
    const ticker=cleanedSymbol;
    console.log(stockName);
    console.log(ticker);

    // Fetch the latest stock price using GLOBAL_QUOTE
    const quoteResponse = await axios.get(
      `${API_URL}/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=${API_KEY}`
    );
     

    if (!quoteResponse.data["Global Quote"] || !quoteResponse.data["Global Quote"]["05. price"]) {
      return res.status(404).json({ error: "Price not available" });
    }

    const price = quoteResponse.data["Global Quote"]["05. price"];
    console.log(`Stock Price: ${price}`);

    // Insert stock details into the database
    const insertResult = await pool.query(
      'INSERT INTO "Stock_portfolio".user_stocks (user_id,stock_name,ticker,quantity,price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, stockName, ticker, 1, price]
    );

    console.log("Inserted stock:", insertResult.rows[0]); // Log inserted stock

    return res.status(201).json({ stock: insertResult.rows[0] });
  } catch (error) {
    console.error("Error adding stock:", error);
    return res.status(500).json({ message: `Error adding stock: ${error.message}` });
  }
});

stockRoutes.put("/update/stock/:id", async (req, res) => {
  const stockId = req.params.id;
  const userId = req.body.id;
  const newPrice = req.body.price;

  console.log(stockId);
  console.log(userId);
  console.log(newPrice);

  try {
    // Update the stock price and return the updated stock details
    const result = await pool.query(
      'UPDATE "Stock_portfolio".user_stocks SET price = $1 WHERE user_id=$2 AND id=$3 RETURNING *',
      [newPrice, userId, stockId]
    );

    if (result.rowCount > 0) {
      return res.status(200).json(result.rows[0]); // Return updated stock
    } else {
      return res.status(404).json({ message: "Stock not found" });
    }
  } catch (err) {
    console.error("Error updating stock:", err);
    return res.status(500).json({ message: "Server error, please try again" });
  }
});



stockRoutes.delete("/delete/stock/:id", async (req, res) => {
  const stockId = req.params.id;
  console.log(stockId);

  try {
    const result = await pool.query(
      'DELETE FROM "Stock_portfolio".user_stocks WHERE id=$1',
      [stockId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Stock not found" });
    }

    return res.status(200).json({ message: "Stock deleted successfully" });
  } catch (err) {
    console.error("Error deleting stock:", err);
    return res.status(500).json({ message: "Server error, please try again" });
  }
});


export default stockRoutes;
