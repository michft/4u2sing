export function getDeploymentEnvironment(): "development" | "preview" | "production" {
  const value = process.env.NEXT_PUBLIC_VERCEL_ENV;

  if (value === "preview" || value === "production") {
    return value;
  }

  return "development";
}

export function isPreviewDeployment(): boolean {
  return getDeploymentEnvironment() === "preview";
}

export function getDeploymentOrigin(): URL | undefined {
  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (explicitUrl) {
    return new URL(explicitUrl);
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();

  if (vercelUrl) {
    return new URL(`https://${vercelUrl}`);
  }

  return undefined;
}
