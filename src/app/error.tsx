"use client";

import { CircleAlertIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { TaskListTitleRow } from "@/components/task-list-title-row";
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
  // The error replaces the whole list page, title row included, and the
  // header has no New task link there.
  const onList = usePathname() === "/";
  const [retrying, startTransition] = useTransition();

  // `reset` alone only re-renders on the client. The failure happened while
  // the server rendered the page, so the server has to render it again.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <div className="flex flex-col gap-7">
      {onList ? <TaskListTitleRow /> : null}
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
    </div>
  );
}
