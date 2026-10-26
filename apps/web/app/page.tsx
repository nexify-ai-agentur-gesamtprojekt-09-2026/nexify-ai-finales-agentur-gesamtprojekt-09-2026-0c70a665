import HomeContent from "../components/HomeContent";
import {publicPages} from "../lib/catalog";
export default function Home(){return <HomeContent home={publicPages().find(page=>page.path==="/")}/>;}
