import dotenv from "dotenv";
dotenv.config();

import express from "express";
import axios from "axios";
import pool from "../Config/db.js";

const stockRoutes=express();
const API_URL=process.env.API_URL;
const API_KEY=process.env.API_KEY;

stockRoutes.post("/stock",async (req,res) =>{
   const inputname=req.body.StockName;
   const userid=req.user.id;
   console.log(userid);
   console.log(inputname);
    try {
      const normalizedInput = inputname.trim().toUpperCase();
      const [existingStock] = await pool.query("SELECT * FROM user_stocks WHERE user_id = ? AND UPPER(stock_name) LIKE ?",[userid, `%${normalizedInput}%`]);
     
      if(existingStock.length>0){
        return res.status(409).json({error:"Stock already added"});
      }
     
        const[rows]=await pool.query("SELECT * FROM user_stocks WHERE user_id=?",[userid]);
        console.log("Stock Array Length:", rows.length);

        if(rows.length>=5){
          return res.status(403).json({error:"Stock Limit Reached"});
        }
        console.log("Stock Data:", rows); // Log the array of stock objects
        // Log the length of the array
        
        const response = await axios.get(`${API_URL}/query?function=SYMBOL_SEARCH&keywords=${normalizedInput}&apikey=${API_KEY}`);
        console.log(response.data.bestMatches[0]);
        if (response.data.bestMatches && response.data.bestMatches.length > 0) {
          const stock = response.data.bestMatches[0];
          const stockName = stock['2. name'];
          const stockSymbol = stock['1. symbol'];
          if (stockSymbol.includes(".BSE")) {
            var cleanedSymbol = stockSymbol.replace(".BSE", "");
            console.log(cleanedSymbol); // Output: "Reliance"
          }
          const ticker=cleanedSymbol;
          console.log(stockName);
          console.log(ticker);
      
          // Fetch the latest stock price using GLOBAL_QUOTE
          const quoteResponse = await axios.get(`${API_URL}/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=${API_KEY}`);
          
          // Check if quoteResponse contains the necessary data
          if (quoteResponse.data['Global Quote'] && quoteResponse.data['Global Quote']['05. price']) {
            const price = quoteResponse.data['Global Quote']['05. price'];
            console.log(`Stock Price: ${price}`);
      
            // Insert stock details into the user's stock table
            const [userResult] = await pool.query("INSERT INTO user_stocks (user_id, stock_name, ticker, quantity, price) VALUES (?, ?, ?, ?, ?)", [userid, stockName, ticker, 1, price]);
            console.log(userResult); // Check if this logs the expected result
         
            const insertedStockId = userResult.insertId; // Capture inserted stock ID
            console.log("Inserted stock ID:", insertedStockId);
            
            const [insertedRow]=await pool.query("SELECT * FROM user_stocks WHERE id=?",[insertedStockId]);
            console.log(insertedRow);
            return res.status(201).json({ stock: insertedRow[0]});
          } else {
            return res.status(404).json({ error: "Price not available" });
          }
        } else {
          return res.status(404).json({ error: "Stock not found" });
        }
      } catch (error) {
        res.status(500).json({ message:`Error adding stcok: ${error.message}`});
      }
      
});

stockRoutes.put("/update/stock/:id",async (req,res)=>{
 const stockid=req.params.id;
 const userid=req.body.id;
 const newprice=req.body.price;

console.log(stockid);
console.log(userid);
console.log(newprice);

 try{
  const [result]=await pool.query ("UPDATE user_stocks SET price = ? WHERE user_id = ? AND id=?", [newprice,userid,stockid]);
  console.log(result);

  if (result.affectedRows > 0) {
    const [updatedStock] = await pool.query(
      "SELECT * FROM user_stocks WHERE id = ?",
      [stockid]
    );

    return res.status(200).json(updatedStock[0]);
} else {
    // If no rows were affected (e.g., no such stock exists for this user)
    return res.status(404).json({ message: "Stock not found" });
}


} catch(err){
  res.status(500).json({ message:"Error"});
 }

});



stockRoutes.delete("/delete/stock/:id",async (req,res)=>{
  const stockid=req.params.id;
  console.log(stockid);

  try{
    const [result]=await pool.query (" DELETE FROM user_stocks WHERE id=?",[stockid]);
  console.log(result);
    return res.status(200).json({message:"Stock deleted" });
  } catch(err){
    res.status(500).json({ message:"Error"});
   }
  
});

export default stockRoutes;