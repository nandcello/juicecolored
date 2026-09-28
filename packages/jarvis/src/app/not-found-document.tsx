import NotFound from "./not-found";

export default function NotFoundDocument() {
  return (
    <html lang="en" data-jarvis-not-found="" style={{ margin: 0, minHeight: "100%" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100%",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 15,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <style>{`html[data-jarvis-not-found] *{box-sizing:border-box}html[data-jarvis-not-found] ::selection{background:#315d47;color:#fff}`}</style>
        <NotFound />
      </body>
    </html>
  );
}
