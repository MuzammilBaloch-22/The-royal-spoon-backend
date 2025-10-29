const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient } = require('dialogflow-fulfillment');
const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { google } = require("googleapis");
const { GoogleAuth } = require("google-auth-library");  // ✅ add this line
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;

// ====== Google Sheets Setup ======
const auth = new GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });


// ✅ Apni sheet ka ID daalna (URL me se)
const SPREADSHEET_ID = "1pvYWhdHy60TnZTvCwD4mX35bagbvM8jkxA_Sr_OFK1Q";

// --- Helpers ---
function getParameterValue(param) {
  if (Array.isArray(param)) return param[0]?.name || param[0] || "";
  if (typeof param === "object" && param !== null) return param.name || "";
  return param || "";
}
function formatDate(dateObj) {
  if (!dateObj) return "";
  try { return new Date(dateObj).toLocaleDateString("en-US"); }
  catch { return ""; }
}
function formatTime(timeObj) {
  if (!timeObj) return "";
  try { return new Date(timeObj).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// ✅ Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/webhook", async (req, res) => {
  const sessionPath = req.body?.session || "";
  const id = sessionPath.length > 43 ? sessionPath.substr(43) : "unknown";
  console.log("Session ID:", id);

  const agent = new WebhookClient({ request: req, response: res });
  console.log("Intent from Dialogflow =>", agent.intent);
  console.log("All parameters:", JSON.stringify(agent.parameters, null, 2));

  // ===== Default Welcome Intent =====
  async function defaultWelcome(agent) {
    agent.add("");
  }

  // ===== Book a Table Intent =====
  async function bookTable(agent) {
    console.log("Intent => Book a Table");

    const fullName = getParameterValue(agent.parameters.fullName);
    const phoneNumber = getParameterValue(agent.parameters.phoneNumber);
    const email = getParameterValue(agent.parameters.email);
    const numberOfGuests = getParameterValue(agent.parameters.numberOfGuests);
    const bookingDate = formatDate(agent.parameters.bookingDate);
    const bookingTime = formatTime(agent.parameters.bookingTime);

    if (!fullName) return agent.add("May I know your full name?");
    if (!phoneNumber) return agent.add("Could you share your phone number?");
    if (!email) return agent.add("What's your email address?");
    if (!numberOfGuests) return agent.add("How many guests should I reserve the table for?");
    if (!bookingDate) return agent.add("On which date would you like to book the table?");
    if (!bookingTime) return agent.add("At what time should I make the reservation?");

    // ====== Save to Google Sheets ======
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Bookings!A1", // Sheet tab ka naam
        valueInputOption: "RAW",
        requestBody: {
          values: [[fullName, phoneNumber, email, numberOfGuests, bookingDate, bookingTime]],
        },
      });
      console.log("✅ Booking data saved to Google Sheets");
    } catch (error) {
      console.error("❌ Error saving to Google Sheets:", error);
    }

    // ====== Send Confirmation Email ======
    try {
      const data = await resend.emails.send({
        from: 'The Royal Spoon <onboarding@resend.dev>',
        to: 'boxerbaloch2211@gmail.com',
        subject: "🍽️ Your Table Reservation at The Royal Spoon",
        html: `
       <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Royal Spoon - Table Reservation Confirmed</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: #fffaf5;
      color: #3b2b1a;
      padding: 20px;
    }

    .container {
      max-width: 650px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e8d7b5;
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
      overflow: hidden;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #d9b27b 0%, #f2d7a3 100%);
      color: #3b2b1a;
      text-align: center;
      padding: 35px 25px;
    }

    .header .crown {
      font-size: 42px;
      margin-bottom: 10px;
    }

    .header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .header p {
      font-size: 14px;
      font-weight: 400;
      opacity: 0.8;
    }

    /* Banner */
    .banner {
      background: #3b2b1a;
      color: #f6e8cc;
      text-align: center;
      padding: 14px;
      font-weight: 600;
      font-size: 15px;
      letter-spacing: 1px;
    }

    /* Content */
    .content {
      padding: 35px 30px;
    }

    .greeting {
      text-align: center;
      font-family: 'Playfair Display', serif;
      color: #b58945;
      font-size: 22px;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .intro {
      text-align: center;
      color: #5b4631;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 30px;
    }

    .details-container {
      border: 1px solid #e8d7b5;
      border-radius: 12px;
      background: #fffaf5;
      padding: 25px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.04);
    }

    .details-title {
      text-align: center;
      font-family: 'Playfair Display', serif;
      color: #b58945;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      border-bottom: 2px solid #e8d7b5;
      padding-bottom: 8px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      padding: 8px 0;
      font-size: 15px;
      border-bottom: 1px dashed #f0e4c7;
    }

    .detail-label {
      font-weight: 600;
      color: #7a5b32;
    }

    .detail-value {
      color: #3b2b1a;
    }

    .instructions {
      background: #fff5e2;
      color: #5b4631;
      border-left: 4px solid #b58945;
      border-radius: 8px;
      padding: 18px;
      margin-top: 25px;
      font-style: italic;
      font-size: 14px;
      text-align: center;
      line-height: 1.6;
    }

    /* Footer */
    .footer {
      background: linear-gradient(135deg, #f2d7a3 0%, #d9b27b 100%);
      color: #3b2b1a;
      text-align: center;
      padding: 25px 20px;
      border-top: 1px solid #e8d7b5;
    }

    .footer-title {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 5px;
    }

    .footer-contact {
      font-size: 14px;
      color: #5b4631;
      margin-bottom: 10px;
    }

    .footer-credit {
      font-size: 11px;
      color: #7a5b32;
    }

    @media (max-width: 768px) {
      .container {
        margin: 15px;
      }
      .header h1 {
        font-size: 24px;
      }
      .greeting {
        font-size: 20px;
      }
      .content {
        padding: 25px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="crown">👑</div>
      <h1>THE ROYAL SPOON</h1>
      <p>Dubai's Premier Dining Experience</p>
    </div>

    <!-- Banner -->
    <div class="banner">
      RESERVATION CONFIRMED
    </div>

    <!-- Content -->
    <div class="content">
      <h2 class="greeting">Dear ${fullName},</h2>
      <p class="intro">
        We are delighted to confirm your reservation at <b>The Royal Spoon</b>.  
        Our team looks forward to serving you a truly royal dining experience.
      </p>

      <div class="details-container">
        <h3 class="details-title">Reservation Details</h3>

        <div class="detail-item">
          <span class="detail-label">👤 Guest Name:</span>
          <span class="detail-value">${fullName}</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">📅 Date:</span>
          <span class="detail-value">${bookingDate}</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">🕐 Time:</span>
          <span class="detail-value">${bookingTime}</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">👥 Party Size:</span>
          <span class="detail-value">${numberOfGuests} Guests</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">📱 Contact:</span>
          <span class="detail-value">${phoneNumber}</span>
        </div>
      </div>

      <div class="instructions">
        Please arrive 15 minutes before your reservation time.<br>
        We can’t wait to welcome you for an unforgettable royal experience.
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-title">The Royal Spoon</p>
      <p class="footer-contact">📍 Dubai, UAE | 📞 +971 55 123 4567</p>
      <p class="footer-credit">© 2025 The Royal Spoon Dubai. All Rights Reserved.<br>
      Designed & Developed by <b>Muzammil Baloch 👨‍💻</b></p>
    </div>
  </div>
</body>
        `,
      });
      console.log("Resend Email Sent:", data);
    } catch (error) {
      console.error("Resend Email Error:", error);
    }

    const responseMessage = `🍽️ Your table awaits, ${fullName}. Reserved for ${numberOfGuests} guests on 📅 ${bookingDate} at ⏰ ${bookingTime}. We look forward to hosting you at The Royal Spoon ✨.`;
    agent.add(responseMessage);
  }

  // ===== Book for Event Intent =====
  async function bookEvent(agent) {
    console.log("Intent => Book For Event");

    const person_name = getParameterValue(agent.parameters.person_name);
    const phone_number = getParameterValue(agent.parameters.phone_number);
    const email_address = getParameterValue(agent.parameters.email_address);
    const event_type = getParameterValue(agent.parameters.event_type);
    const event_date = formatDate(agent.parameters.event_date);
    const event_time = formatTime(agent.parameters.event_time);
    const number_of_guests = getParameterValue(agent.parameters.number_of_guests);

    if (!person_name) return agent.add("May I know your full name?");
    if (!phone_number) return agent.add("Could you share your phone number?");
    if (!email_address) return agent.add("What's your email address?");
    if (!event_type) return agent.add("What type of event would you like to book?");
    if (!event_date) return agent.add("On which date should I book your event?");
    if (!event_time) return agent.add("At what time will your event take place?");
    if (!number_of_guests) return agent.add("How many guests will be attending the event?");

   // ====== Save to Google Sheets ======
    // try {
    //   await sheets.spreadsheets.values.append({
    //     spreadsheetId: SPREADSHEET_ID,
    //     range: "Bookings!A1", // Sheet tab ka naam
    //     valueInputOption: "RAW",
    //     requestBody: {
    //       values: [[fullName, phoneNumber, email, numberOfGuests, bookingDate, bookingTime,]],
    //     },
    //   });
    //   console.log("✅ Booking data saved to Google Sheets");
    // } catch (error) {
    //   console.error("❌ Error saving to Google Sheets:", error);
    // }


    try {
      const data = await resend.emails.send({
        from: 'The Royal Spoon <onboarding@resend.dev>',
        to: 'boxerbaloch2211@gmail.com',
        subject: `🎉 Event Confirmation - ${event_type}`,
        html: `
         <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>The Royal Spoon - Event Confirmation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d1810 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 700px;
      margin: 0 auto;
      background: #000;
      border: 3px solid #D4AF37;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 
        0 25px 80px rgba(212,175,55,0.4),
        0 0 0 1px rgba(212,175,55,0.1),
        inset 0 1px 0 rgba(255,255,255,0.1);
      position: relative;
      animation: slideIn 0.8s ease-out;
    }
    
    .container::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: conic-gradient(from 0deg, transparent, rgba(212,175,55,0.1), transparent);
      animation: rotate 10s linear infinite;
      z-index: -1;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(50px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes rotate {
      to {
        transform: rotate(360deg);
      }
    }
    
    @keyframes shine {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    .header {
      background: linear-gradient(135deg, #8B0000 0%, #A52A2A 50%, #8B0000 100%);
      text-align: center;
      color: #D4AF37;
      padding: 40px 30px;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      animation: shine 3s infinite;
    }
    
    .header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 3px;
      margin-bottom: 8px;
      text-shadow: 2px 2px 10px rgba(0,0,0,0.5);
    }
    
    .header p {
      font-style: italic;
      font-size: 16px;
      opacity: 0.9;
      font-weight: 300;
    }
    
    .banner {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%);
      color: #000;
      text-align: center;
      padding: 15px;
      font-weight: 600;
      font-size: 18px;
      letter-spacing: 1px;
      position: relative;
      overflow: hidden;
    }
    
    .banner::before {
      content: '✨';
      position: absolute;
      left: 20px;
      animation: pulse 2s infinite;
    }
    
    .banner::after {
      content: '✨';
      position: absolute;
      right: 20px;
      animation: pulse 2s infinite 1s;
    }
    
    .content {
      padding: 40px 30px;
      background: linear-gradient(135deg, #2C1810 0%, #3D241A 100%);
      color: #fff;
      position: relative;
    }
    
    .event-title {
      text-align: center;
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: #D4AF37;
      margin-bottom: 8px;
      font-weight: 700;
    }
    
    .event-subtitle {
      text-align: center;
      font-style: italic;
      color: #ccc;
      margin-bottom: 30px;
      font-size: 16px;
    }
    
    .details-grid {
      display: grid;
      gap: 15px;
      margin-top: 25px;
    }
    
    .detail-item {
      background: rgba(212,175,55,0.12);
      padding: 18px 20px;
      border-radius: 12px;
      border-left: 4px solid #D4AF37;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }
    
    .detail-item:hover {
      background: rgba(212,175,55,0.2);
      transform: translateX(5px);
      box-shadow: 0 5px 20px rgba(212,175,55,0.3);
    }
    
    .detail-label {
      color: #D4AF37;
      font-weight: 600;
      font-size: 15px;
      display: inline-block;
      min-width: 120px;
    }
    
    .detail-value {
      color: #fff;
      font-weight: 400;
    }
    
    .message {
      margin-top: 35px;
      text-align: center;
      font-style: italic;
      color: #ddd;
      font-size: 16px;
      line-height: 1.6;
      padding: 20px;
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      border: 1px solid rgba(212,175,55,0.2);
    }
    
    .signature {
      text-align: center;
      margin-top: 25px;
    }
    
    .signature-line1 {
      color: #D4AF37;
      font-weight: 600;
      margin: 10px 0;
      font-size: 16px;
    }
    
    .signature-line2 {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 15px;
    }
    
    .footer {
      background: linear-gradient(135deg, #000 0%, #1a0a00 100%);
      color: #D4AF37;
      text-align: center;
      padding: 30px 20px;
      border-top: 1px solid rgba(212,175,55,0.3);
    }
    
    .footer-title {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .footer-contact {
      color: #E5E5E5;
      font-size: 15px;
      margin: 8px 0;
    }
    
    .footer-credit {
      color: #888;
      font-size: 12px;
      margin-top: 15px;
      line-height: 1.4;
    }
    
    .footer-credit b {
      color: #D4AF37;
    }
    
    .decorative-line {
      height: 2px;
      background: linear-gradient(90deg, transparent, #D4AF37, transparent);
      margin: 20px 0;
      border-radius: 1px;
    }
    
    @media (max-width: 768px) {
      .container {
        margin: 10px;
        border-radius: 15px;
      }
      
      .header {
        padding: 30px 20px;
      }
      
      .header h1 {
        font-size: 26px;
      }
      
      .content {
        padding: 30px 20px;
      }
      
      .event-title {
        font-size: 24px;
      }
      
      .detail-item {
        padding: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>THE ROYAL SPOON</h1>
      <p>Private Events & Celebrations</p>
    </div>

    <!-- Banner -->
    <div class="banner">
      EVENT BOOKING CONFIRMED
    </div>

    <!-- Content -->
    <div class="content">
      <h2 class="event-title">🎉 ${event_type} Confirmed</h2>
      <p class="event-subtitle">Your exclusive event booking at The Royal Spoon</p>
      
      <div class="decorative-line"></div>
      
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">👤 Host:</span>
          <span class="detail-value">${person_name}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">🎉 Event Type:</span>
          <span class="detail-value">${event_type}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">📅 Date:</span>
          <span class="detail-value">${event_date}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">🕐 Time:</span>
          <span class="detail-value">${event_time}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">👥 Guests:</span>
          <span class="detail-value">${number_of_guests} People</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">📱 Contact:</span>
          <span class="detail-value">${phone_number}</span>
        </div>
    
      <div class="message">
        We are honored to host your special celebration and create unforgettable memories for you and your loved ones.
      </div>
      
      <div class="signature">
        <p class="signature-line1">With Excitement,</p>
        <p class="signature-line2">The Royal Spoon Events Team</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-title">The Royal Spoon</p>
      <p class="footer-contact">📍 Dubai, UAE | 📞 +971 55 123 4567</p>
      <p class="footer-credit">© 2025 The Royal Spoon Dubai. All Rights Reserved.<br>Designed & Developed by <b>Muzammil Baloch 👨‍💻</b></p>
    </div>
  </div>
</body>
</html>
        `,
      });
      console.log("Resend Email Sent:", data);
    } catch (error) {
      console.error("Resend Email Error:", error);
    }

    const responseMessage = `🎉 ${event_type} confirmed for ${number_of_guests} guests on 📅 ${event_date} at ⏰ ${event_time}. Our team at The Royal Spoon is preparing an experience where celebration meets sophistication ✨.`;
    agent.add(responseMessage);
  }

  // ===== Fallback =====
  function fallback(agent) {
    agent.add("Sorry, I didn't understand that. Can you please repeat?");
  }

  // Map intents
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', defaultWelcome);
  intentMap.set('Book a Table', bookTable);
  intentMap.set('Book For Event', bookEvent);
  intentMap.set('Default Fallback Intent', fallback);

  await agent.handleRequest(intentMap);
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
