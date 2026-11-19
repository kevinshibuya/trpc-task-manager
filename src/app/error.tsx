"use client";

import { CircleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { describeError } from "@/features/tasks/describe-error";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();

  // `reset` alone only re-renders on the client. The failure happened while
  // the server rendered the page, so the server has to render it again.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <div className="flex flex-col items-start gap-4">
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>This page could not be loaded</AlertTitle>
        <AlertDescription>{describeError(error).message}</AlertDescription>
      </Alert>
      <Button variant="outline" onClick={retry} disabled={retrying}>
        Try again
      </Button>
    </div>
  );
}
