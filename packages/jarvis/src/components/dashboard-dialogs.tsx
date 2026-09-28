"use client";

import Image from "next/image";
import * as stylex from "@stylexjs/stylex";
import { ArrowRight, ArrowUpRight, EyeOff } from "lucide-react";
import { Modal, ui } from "./ui";
import type { DashboardController } from "./use-dashboard";
import c from "./dashboard.module.css";

export function DashboardDialogs({ controller }: { controller: DashboardController }) {
  const {
    state,
    device,
    dialog,
    closeDialog,
    busy,
    qr,
    region,
    setRegion,
    startLogin,
    pollLogin,
    setDialog,
    notice,
    task,
    setRoom,
  } = controller;
  return (
    <>
      {dialog === "connect" ? (
        <Modal
          title={state.connected ? "Your Xiaomi connection" : "Connect Xiaomi Home"}
          onClose={closeDialog}
        >
          <div {...stylex.props(ui.stack)}>
            <p {...stylex.props(ui.muted)}>
              Choose the region used by your Xiaomi Home account. For the Philippines, use
              Singapore.
            </p>
            <label {...stylex.props(ui.label)}>
              Account region
              <select
                disabled={busy || !!qr}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                {...stylex.props(ui.input)}
              >
                <option value="sg">Singapore / Philippines</option>
                <option value="cn">Mainland China</option>
                <option value="de">Europe</option>
                <option value="us">United States</option>
                <option value="in">India</option>
                <option value="tw">Taiwan</option>
              </select>
            </label>
            {qr ? (
              <>
                <div className={c.qr}>
                  {/* Xiaomi's short-lived, authenticated QR image cannot use the shared image optimizer. */}
                  <Image
                    unoptimized
                    src={qr.image}
                    width="240"
                    height="240"
                    alt="Scan this sign-in code using Xiaomi Home"
                  />
                </div>
                <p {...stylex.props(ui.muted)}>
                  In Xiaomi Home, tap <strong>+ → Scan</strong> and approve this sign-in. This code
                  expires at{" "}
                  {new Date(qr.expires).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  .
                </p>
                <button
                  disabled={busy}
                  onClick={pollLogin}
                  {...stylex.props(ui.button, ui.primary)}
                >
                  {busy ? "Checking Xiaomi Home…" : "I’ve scanned the code"}
                  <ArrowRight size={16} />
                </button>
                <button disabled={busy} onClick={startLogin} {...stylex.props(ui.button, ui.ghost)}>
                  Create a new code
                </button>
              </>
            ) : (
              <>
                <button
                  disabled={busy}
                  onClick={startLogin}
                  {...stylex.props(ui.button, ui.primary)}
                >
                  {busy ? "Creating a sign-in code…" : "Connect with Xiaomi Home"}
                  <ArrowUpRight size={16} />
                </button>
                <p {...stylex.props(ui.muted)}>
                  Xiaomi handles sign-in. Jarvis never asks for your Xiaomi password. Reconnect here
                  if Xiaomi expires the connection.
                </p>
                {state.connected ? (
                  <button
                    disabled={busy}
                    onClick={() => setDialog("disconnect")}
                    {...stylex.props(ui.button, ui.ghost)}
                  >
                    Disconnect Xiaomi Home
                  </button>
                ) : null}
              </>
            )}
            {notice ? (
              <p role={notice.error ? "alert" : "status"} {...stylex.props(ui.muted)}>
                {notice.text}
              </p>
            ) : null}
          </div>
        </Modal>
      ) : null}
      {dialog === "save" && device ? (
        <Modal title="Save light as a scene" onClose={closeDialog}>
          <form
            {...stylex.props(ui.stack)}
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              if (
                await task(
                  {
                    type: "saveScene",
                    id: device.id,
                    name: data.get("name"),
                  },
                  "Scene saved.",
                )
              )
                closeDialog();
            }}
          >
            <p {...stylex.props(ui.muted)}>
              Save the light’s current brightness and color. Jarvis reads the bulb before saving.
            </p>
            <label {...stylex.props(ui.label)}>
              Scene name
              <input
                autoFocus
                name="name"
                placeholder="Sunday morning"
                required
                maxLength={40}
                {...stylex.props(ui.input)}
              />
            </label>
            <button disabled={busy} {...stylex.props(ui.button, ui.primary)}>
              {busy ? "Saving…" : "Save scene"}
            </button>
            {notice?.error ? (
              <p role="alert" {...stylex.props(ui.muted)}>
                {notice.text}
              </p>
            ) : null}
          </form>
        </Modal>
      ) : null}
      {dialog === "device" && device ? (
        <Modal title="Device settings" onClose={closeDialog}>
          <form
            {...stylex.props(ui.stack)}
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              if (
                await task(
                  {
                    type: "metadata",
                    id: device.id,
                    name: data.get("name"),
                    room: data.get("room"),
                  },
                  "Device details saved.",
                )
              ) {
                setRoom(null);
                closeDialog();
              }
            }}
          >
            <label {...stylex.props(ui.label)}>
              Device name
              <input
                name="name"
                defaultValue={device.name}
                required
                maxLength={60}
                {...stylex.props(ui.input)}
              />
            </label>
            <label {...stylex.props(ui.label)}>
              Room
              <input
                name="room"
                defaultValue={device.room}
                required
                maxLength={40}
                {...stylex.props(ui.input)}
              />
            </label>
            <p {...stylex.props(ui.muted)}>These names organize your devices inside Jarvis.</p>
            <button disabled={busy} {...stylex.props(ui.button, ui.primary)}>
              Save changes
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (
                  await task(
                    { type: "visibility", id: device.id, hidden: true },
                    "Device hidden. Restore it from Settings.",
                  )
                ) {
                  setRoom(null);
                  closeDialog();
                }
              }}
              {...stylex.props(ui.button, ui.ghost)}
            >
              <EyeOff size={16} />
              Hide device
            </button>
            {notice?.error ? (
              <p role="alert" {...stylex.props(ui.muted)}>
                {notice.text}
              </p>
            ) : null}
          </form>
        </Modal>
      ) : null}
      {dialog === "disconnect" ? (
        <Modal title="Disconnect Xiaomi Home?" onClose={closeDialog}>
          <div {...stylex.props(ui.stack)}>
            <p {...stylex.props(ui.muted)}>
              Jarvis will remove its Xiaomi credentials and device list. Your saved scenes stay
              here. You can reconnect with a new QR code.
            </p>
            <button
              disabled={busy}
              onClick={async () => {
                if (
                  await task(
                    {
                      type: "disconnect",
                    },
                    "Xiaomi Home disconnected.",
                  )
                )
                  closeDialog();
              }}
              {...stylex.props(ui.button, ui.danger)}
            >
              Disconnect account
            </button>
          </div>
        </Modal>
      ) : null}
      {dialog === "help" ? (
        <Modal title="Help" onClose={closeDialog}>
          <div {...stylex.props(ui.stack)}>
            <p {...stylex.props(ui.muted)}>
              <strong>Connect your devices</strong>
              <br />
              Add your Yeelight or fan to Xiaomi Home first. Then connect the same Xiaomi account in
              Jarvis. Your device must be powered and online.
            </p>
            <p {...stylex.props(ui.muted)}>
              <strong>Keep things current</strong>
              <br />
              Jarvis reads one visible device each minute, rotating through your devices while this
              page is visible. Use Refresh for an immediate reading. A timeout may mean a command
              arrived but its confirmation did not; refresh before retrying.
            </p>
            <p {...stylex.props(ui.muted)}>
              <strong>Still in Xiaomi Home</strong>
              <br />
              Wi-Fi setup, firmware, sharing, music sync and recurring automations.
            </p>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
