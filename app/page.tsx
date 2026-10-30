import { DesktopHome } from "@/features/app-shell/components/DesktopHome";
import { Responsive } from "@/features/app-shell/components/Responsive";
import { OffersScreen } from "@/features/offers/components/OffersScreen";

const Home = () => {
  return <Responsive mobile={<OffersScreen />} desktop={<DesktopHome />} />;
};

export default Home;
