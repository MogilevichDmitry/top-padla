// Telegram notification utilities

interface GameNotification {
  date: string;
  startTime: string;
  location: string;
  createdBy: string;
}

export async function sendNewGameNotification(game: GameNotification) {
  const botToken = process.env.BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  console.log("🔔 sendNewGameNotification called with:", game);
  console.log("🔑 BOT_TOKEN exists:", !!botToken);
  console.log("🔑 TELEGRAM_CHAT_ID exists:", !!chatId);
  console.log("🔑 TELEGRAM_CHAT_ID value:", chatId);

  if (!botToken || !chatId) {
    console.warn(
      "❌ BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping notification"
    );
    return;
  }

  try {
    // Format date nicely (YYYY-MM-DD -> DD.MM)
    const dateObj = new Date(game.date);
    const dateFormatted = `${dateObj.getDate().toString().padStart(2, "0")}.${(
      dateObj.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}`;

    // Format time - remove seconds if present (HH:MM:SS -> HH:MM)
    const time =
      game.startTime.length > 5
        ? game.startTime.substring(0, 5)
        : game.startTime;

    const message = `🎾 <b>Новый матч создан!</b>

📅 <b>${dateFormatted}</b> в ${time}
📍 ${game.location}
👤 Инициатор: ${game.createdBy}

💡 <i>👉 Присоединяйся: <a href="https://www.qwerty123.eu/schedule">qwerty123.eu/schedule</a></i>`;

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send Telegram notification:", error);
    } else {
      console.log("Telegram notification sent successfully");
    }
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
  }
}
