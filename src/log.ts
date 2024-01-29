/* eslint-disable no-console */

const redEsc = "\u001b[33m";
const yellowEsc = "\u001b[33m";
const resetEsc = "\u001b[39m";

/**
 * Output on stdout the given log with the right level. Add ANSI color escape
 * codes if stdout is currently a tty.
 * @param {string} level
 * @param {string} msg
 */
export default function log(
  level: "LOG" | "WARNING" | "ERROR",
  msg: string
): void {
  let message = "";
  if (process.stdout.isTTY) {
    if (level === "WARNING") {
      message = yellowEsc + "[" + level + "]" + resetEsc + " ";
    } else if (level === "ERROR") {
      message = redEsc + "[" + level + "]" + resetEsc + " ";
    }
  } else if (level !== "LOG") {
    message = "[" + level + "] ";
  }
  message += msg;

  if (level === "LOG") {
    console.log(message);
  } else if (level === "WARNING") {
    console.warn(message);
  } else {
    console.error(message);
  }
}
