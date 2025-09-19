//import Link from "next/link";

//import { LatestPost } from "~/app/_components/post";
//import { auth } from "~/server/auth";
//import { HydrateClient } from "~/trpc/server";
//import { SSETest } from "~/components/SSETest";
import { YjsTest } from "~/components/YjsTest";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Real-time <span className="text-[hsl(280,100%,70%)]">Editor</span>
        </h1>
        
        <YjsTest />
        
      </div>
    </main>
  );
}
