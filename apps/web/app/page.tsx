import HomeContent from "../components/HomeContent";
import {publicPages} from "../lib/catalog";
export default function Home(){const pages=publicPages();return <HomeContent home={pages.find(page=>page.path==="/")} pages={pages}/>;}
