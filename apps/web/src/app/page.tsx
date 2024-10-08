import Container from "@/components/ui/container";
import Jumbotron from "@/components/jumbotron";
import ContainerHeader from "@/components/container-header";
import MainNews from "@/components/main-news";
import MisaSchedule from "@/components/schedule";
import Announcement from "@/components/announcement";
import Sacraments from "@/components/sacraments";
import Info from "@/components/info";
import Rings from "@/components/icons/rings";
import { Text } from "@radix-ui/themes";
import api from "@/utils/strapi";

async function getArticles() {
  // TODO: fix unit test error
  try {
    const { items } = await api.article.search({
      page: 1,
      limit: 5,
      sort: ["publishedAt:desc"],
    });
    return items;
  } catch (e) {
    console.error(e);
    return [];
  }
}

// TODO: find a way to remove the line below
export const dynamic = "force-dynamic";

export default async function Home() {
  const articles = await getArticles();

  return (
    <div>
      <Container>
        <div className="max-w-screen-lg mx-auto">
          <Jumbotron />
        </div>
      </Container>
      <Container className="bg-gray-50">
        <div className="max-w-screen-lg mx-auto">
          <ContainerHeader>Berita</ContainerHeader>
          <MainNews articles={articles} />
        </div>
      </Container>
      <Container className="bg-white">
        <div className="max-w-screen-lg mx-auto">
          <ContainerHeader>Jadwal Misa</ContainerHeader>
          <MisaSchedule />
        </div>
      </Container>
      <Container className="bg-gray-50">
        <div className="flex flex-col md:flex-row w-full gap-8 max-w-screen-lg mx-auto ">
          <div className="grow max-w-[380px] md:border-r md:pr-8">
            <ContainerHeader className="text-base">Pengumuman</ContainerHeader>
            <Announcement />
          </div>
          <div className="grow">
            <div className="flex gap-5 items-center">
              <Rings />
              <div>
                <ContainerHeader className="text-base">
                  Akan Menerima Sakramen Perkawinan
                </ContainerHeader>
                <Text as="p" className="text-sm">
                  Jika umat mengetahui adanya halangan perkawinan ini, wajib
                  memberitahu pastor paroki
                </Text>
              </div>
            </div>
            <Sacraments />
          </div>
        </div>
      </Container>
      <Container className="bg-white">
        <div className="max-w-screen-lg mx-auto ">
          <Info />
        </div>
      </Container>
    </div>
  );
}
