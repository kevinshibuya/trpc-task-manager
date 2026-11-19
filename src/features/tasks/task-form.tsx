"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { type TaskInput, taskInput } from "@/server/tasks/task";

import { describeError } from "./describe-error";

/** What the form hands to `onSave`: validated by the server's schema, trimmed. */
export type TaskFormValues = z.output<typeof taskInput>;

const FIELDS = ["title", "description"] as const;

type TaskFormProps = {
  /** The task's current values, when editing one. */
  defaultValues?: TaskInput;
  submitLabel: string;
  /** Saves the values. A rejection is shown in the form, on a field when it names one. */
  onSave: (values: TaskFormValues) => Promise<void>;
};

/** The one form for creating and editing a task. */
export function TaskForm({
  defaultValues,
  submitLabel,
  onSave,
}: TaskFormProps) {
  const id = useId();
  const initialValues = {
    title: defaultValues?.title ?? "",
    description: defaultValues?.description ?? "",
  };
  const [failure, setFailure] = useState<{
    message: string;
    notFound: boolean;
  } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput, unknown, TaskFormValues>({
    // The schema the server validates with, so both sides agree. The defaults
    // already validate on submit, then again on every change.
    resolver: zodResolver(taskInput),
    defaultValues: initialValues,
  });

  const save = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onSave(values);
    } catch (error) {
      const { message, fieldErrors, notFound } = describeError(error);
      const failedFields = FIELDS.filter((field) => fieldErrors[field]);
      failedFields.forEach((field, i) =>
        setError(
          field,
          { type: "server", message: fieldErrors[field] },
          { shouldFocus: i === 0 },
        ),
      );
      if (failedFields.length === 0) setFailure({ message, notFound });
    }
  });

  return (
    <form
      aria-label="Task"
      onSubmit={save}
      noValidate
      className="flex flex-col gap-6"
    >
      {failure ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The task could not be saved</AlertTitle>
          <AlertDescription>
            <p>{failure.message}</p>
            {/* The task is gone, so saving again cannot work. */}
            {failure.notFound ? <Link href="/">Back to the list</Link> : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
          <Input
            id={`${id}-title`}
            autoComplete="off"
            aria-required
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? `${id}-title-error` : undefined}
            // react-hook-form fills its fields only once they mount, so the
            // values are also given here for the server-rendered HTML.
            defaultValue={initialValues.title}
            {...register("title")}
          />
          <FieldError id={`${id}-title-error`} errors={[errors.title]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor={`${id}-description`}>
            Description (optional)
          </FieldLabel>
          <Textarea
            id={`${id}-description`}
            aria-invalid={!!errors.description}
            aria-describedby={
              errors.description ? `${id}-description-error` : undefined
            }
            defaultValue={initialValues.description}
            {...register("description")}
          />
          <FieldError
            id={`${id}-description-error`}
            errors={[errors.description]}
          />
        </Field>
      </FieldGroup>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {submitLabel}
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
