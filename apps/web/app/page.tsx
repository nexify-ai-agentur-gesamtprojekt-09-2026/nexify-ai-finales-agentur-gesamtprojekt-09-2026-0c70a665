import PublicExperience from "../components/PublicExperience";
import {publicExperienceData} from "../lib/catalog";
export default function Home(){return <PublicExperience page={publicExperienceData.pages.find(page=>page.path==="/")!} data={publicExperienceData} documentTitle/>;}
