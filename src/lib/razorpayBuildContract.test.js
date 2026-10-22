import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const readProjectFile = (...parts) =>
  fs.readFileSync(path.join(projectRoot, ...parts), "utf8");

describe("Razorpay production-build contract", () => {
  test("requires a public key during Docker build without copying .env files", () => {
    const dockerfile = readProjectFile("Dockerfile");
    const dockerignore = readProjectFile(".dockerignore");
    const workflow = readProjectFile(".github", "workflows", "deploy.yml");

    expect(dockerfile).toContain("ARG REACT_APP_RAZORPAY_KEY_ID");
    expect(dockerfile).toContain("node scripts/verifyRazorpayBuild.js");
    expect(dockerignore).toMatch(/^\.env$/m);
    expect(dockerignore).toMatch(/^\.env\.\*$/m);
    expect(workflow).toContain("--build-arg REACT_APP_RAZORPAY_KEY_ID");
    expect(workflow).toContain("secrets.REACT_APP_RAZORPAY_KEY_ID");
    expect(workflow).toContain("set -euo pipefail");
    expect(workflow).toContain("docker compose up -d --force-recreate");
    expect(workflow).toContain("main.69149353.js");
    expect(workflow).toContain("active bundle lacks Razorpay checkout configuration");
  });
});
