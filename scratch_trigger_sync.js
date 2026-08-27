import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET || "supersecretjwtkey12345");

console.log("Triggering sync via POST request...");
fetch("http://localhost:3000/api/emails/sync", {
  method: "POST",
  headers: {
    "Cookie": `smartinbox_auth=${token}`
  }
})
.then(async (res) => {
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
})
.catch(console.error);
