import puppeteer from "puppeteer";

import { exec } from "child_process";

import fs from "fs";
import path from "path";
import os from "os";

// 0 写入结果
function writeRes(content) {
  const desktopPath = path.join(os.homedir(), "Desktop"); // 获取桌面路径
  const filePath = path.join(desktopPath, "warning_check_res.txt"); // 目标文件路径
  // const content = "Hello, this is a test file written by Node.js!";

  fs.writeFile(filePath, content, (err) => {
    if (err) {
      console.error("写入结果出错:", err);
    } else {
      console.log("\n对比不一致,写入成功:", filePath);
    }
  });
}

// -1-获取最新的 iOS 运行时
async function getRemoteIosRuntime() {
  const url =
    "https://developer.apple.com/documentation/ios-ipados-release-notes";
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2" }); // 等待页面加载完成

  // 获取所有 <p> 标签，并筛选符合条件的文本
  const paragraphs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("p"))
      .map((p) => p.textContent)
      .filter((text) =>
        ["iOS", "iPadOS", "Release", "Notes"].every((keyword) =>
          text.includes(keyword)
        )
      )
      .map((item) => {
        const r = item.split(" ");
        return r[3];
      });
  });

  await browser.close();
  return paragraphs;
}

// -2-获取本地可用的 iOS 运行时
function getLocalIosRuntimes() {
  return new Promise((resolve, reject) => {
    exec("xcrun simctl list runtimes", (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`Stderr: ${stderr}`);
        return;
      }

      // 解析输出内容
      const runtimes = stdout
        .split("\n")
        .filter((line) => line.startsWith("iOS"))
        .map((line) => {
          const res = line.split(" ");
          const r = res[1];
          return r;
        });
      resolve(runtimes);
    });
  });
}

async function check_ios_runtime() {
  let localVersionLatest;
  try {
    const localVersion = await getLocalIosRuntimes();
    localVersionLatest = localVersion[localVersion.length - 1];
    console.log("本地可用的 iOS 运行时:", JSON.stringify(localVersion));
    console.log(" --> 本地最新的 iOS 运行时:", localVersionLatest);
  } catch (e) {
    console.error("获取本地 可用 运行时候,Error:", e);
  }

  let remoteVersionLatest;
  try {
    const remoteVersion = await getRemoteIosRuntime();
    remoteVersionLatest = remoteVersion[0];
    // remoteVersionLatest = "18.2";
    console.log("\n远程最新的 iOS 运行时:", JSON.stringify(remoteVersion));
    console.log(" --> 远程最新的 iOS 运行时:", remoteVersionLatest);
  } catch (e) {
    console.error("获取远程 最新 运行时候,Error:", e);
  }

  // 比较本地和远程的 iOS 运行时
  if (localVersionLatest !== remoteVersionLatest) {
    // console.log(`\n---对比不一致---,写入到桌面`);
    writeRes(
      `请去xcode下载 Xcode > Preferences > Components; \n\n本地最新的 iOS 运行时: ${localVersionLatest}\n远程最新的 iOS 运行时: ${remoteVersionLatest}`
    );
  } else {
    console.log(`\n---ok---`);
  }
}

// 检查最新的 iOS 运行时,提醒用户去及时更新，避免用的时候半天下载不下来
check_ios_runtime();
