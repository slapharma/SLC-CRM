"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

type Props = ButtonProps & {
  /** Message shown in the confirm() dialog before the form submits. */
  confirmMessage: string;
};

/**
 * A submit button that asks for confirmation before letting the form submit,
 * and disables itself while the action is pending (preventing double-submits).
 * Use inside a `<form action={…}>` in place of a bare destructive `<Button>`.
 */
export function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  disabled,
  children,
  ...props
}: Props) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
