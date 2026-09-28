import { Document } from "../components/document";
import NotFound from "./not-found";
import "@fontsource/barlow-condensed/latin-800.css";
import styles from "./not-found.module.css";

export default function NotFoundDocument() {
  return (
    <Document bodyClassName={styles.document}>
      <NotFound />
    </Document>
  );
}
