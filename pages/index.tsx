import type { GetServerSideProps } from "next";

// Root route ("/") has no content of its own — it just forwards straight to
// the vehicle & license registry demo, so `yarn dev` / `yarn start` lands
// somewhere useful instead of a 404.
export default function Home() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/vehicle-demo",
      permanent: false,
    },
  };
};
