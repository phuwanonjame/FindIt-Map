import { useNavigate } from "react-router-dom";
import CreatePostLanding from "@/components/CreatePostLanding";

export default function HomeLanding() {
  const navigate = useNavigate();
  return <CreatePostLanding onChooseType={(type) => navigate(`/post/new?type=${type}`)} />;
}
