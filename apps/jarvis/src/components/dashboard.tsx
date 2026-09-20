"use client";

import Link from "next/link";
import Image from "next/image";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Activity as ActivityIcon,
  Check,
  ChevronDown,
  CircleHelp,
  House,
  Lightbulb,
  LogOut,
  Plus,
  Fan,
  EyeOff,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import type { LightDevice, FanDevice, Scene, Snapshot } from "@/lib/domain";
import { request } from "@/lib/client";
import { FanControls } from "./fan-controls";
import { LightControls } from "./light-controls";
import { Modal, ui } from "./ui";
type View = "devices" | "scenes" | "activity" | "settings";
type Dialog = "connect" | "save" | "device" | "disconnect" | "help" | null;
type QR = {
  key: string;
  image: string;
  expires: number;
};
export function Dashboard({ initial, presets }: { initial: Snapshot; presets: Scene[] }) {
  const [state, setState] = useState(initial),
    [selected, setSelected] = useState(initial.devices[0]?.id ?? ""),
    [view, setView] = useState<View>("devices"),
    [room, setRoom] = useState("All rooms");
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<{
      text: string;
      error: boolean;
    } | null>(null),
    [dialog, setDialog] = useState<Dialog>(null),
    [qr, setQR] = useState<QR | null>(null),
    [region, setRegion] = useState("sg"),
    [stale, setStale] = useState(false);
  const working = useRef(false),
    alive = useRef(true),
    qrVersion = useRef(0);
  const shownDevices = state.devices.filter((d) => !d.hidden);
  const lights = shownDevices.filter((d): d is LightDevice => d.kind === "light");
  const device =
    (view === "scenes" ? lights : shownDevices).find((d) => d.id === selected) ??
    (view === "scenes" ? lights : shownDevices)[0];
  const rooms = ["All rooms", ...new Set(shownDevices.map((d) => d.room))],
    visible = shownDevices.filter(
      (d) => room === "All rooms" || !rooms.includes(room) || d.room === room,
    );
  const scenes = [...presets, ...state.scenes];
  useEffect(() => {
    alive.current = true;
    const timer = setInterval(async () => {
      if (working.current || document.hidden) return;
      try {
        const next = await request<Snapshot>();
        if (alive.current) {
          setState(next);
          setStale(false);
        }
      } catch {
        if (alive.current) setStale(true);
      }
    }, 15000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!device?.id) return;
    const id = device.id;
    const timer = setInterval(async () => {
      if (working.current || document.hidden) return;
      working.current = true;
      try {
        await request({
          type: "refresh",
          id,
        });
        const next = await request<Snapshot>();
        if (alive.current) {
          setState(next);
          setStale(false);
        }
      } catch {
        if (alive.current) setStale(true);
      } finally {
        working.current = false;
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [device?.id]);
  async function task(operation: Record<string, unknown>, message?: string) {
    if (working.current) {
      setNotice({
        text: "A request is in progress. Give it a moment, then try again.",
        error: false,
      });
      return;
    }
    working.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const result = await request(operation);
      const next = await request<Snapshot>();
      setState(next);
      setStale(false);
      if (message || result.warning)
        setNotice({
          text: String(result.warning ?? message),
          error: !!result.warning,
        });
      return result;
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : "Could not complete the request.",
        error: true,
      });
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function startLogin() {
    const version = ++qrVersion.current;
    setQR(null);
    const result = await task({
      type: "startLogin",
      region,
    });
    if (result && version === qrVersion.current) setQR(result as QR);
  }
  function closeDialog() {
    qrVersion.current++;
    setDialog(null);
    setQR(null);
  }
  async function pollLogin() {
    if (!qr) return;
    const result = await task({
      type: "pollLogin",
      key: qr.key,
    });
    if (result?.connected) {
      closeDialog();
      setNotice({
        text: result.warning ? String(result.warning) : "Xiaomi Home is connected. Welcome home.",
        error: !!result.warning,
      });
    } else if (result?.pending)
      setNotice({
        text: "Waiting for approval. Scan the code in Xiaomi Home, then check again.",
        error: false,
      });
  }
  function command(action: string, data: Record<string, unknown> = {}) {
    if (device)
      void task(
        {
          type: "control",
          id: device.id,
          action,
          data,
        },
        "Device updated.",
      );
  }
  function applyScene(scene: Scene) {
    if (device?.kind === "light")
      void task(
        {
          type: "control",
          id: device.id,
          action: "scene",
          data: {
            mode: scene.mode,
            color: scene.color,
            brightness: scene.brightness,
            kelvin: scene.kelvin,
          },
        },
        `${scene.name} applied.`,
      );
  }
  const online = shownDevices.filter((d) => d.online && d.updatedAt > 0).length;
  return (
    <div {...stylex.props(s.app)}>
      <a href="#main" {...stylex.props(s.skip)}>
        Skip to controls
      </a>
      <aside {...stylex.props(s.sidebar)}>
        <Link href="/" {...stylex.props(s.brand)}>
          <span {...stylex.props(s.logo)}>j</span>jarvis
          <span {...stylex.props(s.brandDot)}>®</span>
        </Link>
        <div {...stylex.props(s.home)}>
          <span {...stylex.props(s.homeIcon)}>
            <House size={17} />
          </span>
          <span>
            My home
            <small {...stylex.props(s.homeSmall)}>Your personal space</small>
          </span>
          <ChevronDown size={13} />
        </div>
        <p {...stylex.props(s.navLabel)}>YOUR SPACE</p>
        <nav aria-label="Main navigation" {...stylex.props(s.nav)}>
          {(
            [
              {
                id: "devices",
                label: "Devices",
                icon: House,
              },
              {
                id: "scenes",
                label: "Scenes",
                icon: Sparkles,
              },
              {
                id: "activity",
                label: "Activity",
                icon: ActivityIcon,
              },
              {
                id: "settings",
                label: "Settings",
                icon: Settings2,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
              {...stylex.props(s.navItem, view === item.id && s.navActive)}
            >
              <item.icon size={18} />
              {item.label}
              {item.id === "devices" ? (
                <span {...stylex.props(s.count)}>{shownDevices.length}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div {...stylex.props(s.sidebarBottom)}>
          <div {...stylex.props(s.quietCard)}>
            <span {...stylex.props(s.smallDot)} />
            <p>A little more in sync.</p>
            <small>One home. All your devices.</small>
          </div>
          <button onClick={() => setDialog("help")} {...stylex.props(s.help)}>
            <CircleHelp size={16} />A little help
            <ArrowUpRight size={14} />
          </button>
          <div {...stylex.props(s.profile)}>
            <span {...stylex.props(s.avatar)}>N</span>
            <span>
              My account<small {...stylex.props(s.homeSmall)}>Homeowner</small>
            </span>
            <button
              aria-label="Sign out"
              onClick={async () => {
                await task({
                  type: "logout",
                });
                window.location.reload();
              }}
              {...stylex.props(ui.button, ui.ghost)}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <div {...stylex.props(s.workspace)}>
        <header {...stylex.props(s.topbar)}>
          <span {...stylex.props(s.breadcrumb)}>
            My home <span>/</span> <strong>{view.charAt(0).toUpperCase() + view.slice(1)}</strong>
          </span>
          <span {...stylex.props(s.private)}>
            <ShieldCheck size={13} />
            Private space
          </span>
        </header>
        <main id="main" {...stylex.props(s.main)}>
          <div {...stylex.props(s.heading)}>
            <div>
              <p {...stylex.props(s.eyebrow)}>MAKE YOURSELF AT HOME</p>
              <h1 {...stylex.props(s.title)}>
                {view === "devices"
                  ? "Everything, just right."
                  : view === "scenes"
                    ? "A mood for every moment."
                    : view === "activity"
                      ? "The little things, recorded."
                      : "A home of your own."}
              </h1>
              <p {...stylex.props(s.subtitle)}>
                {view === "devices"
                  ? "Your devices. Your atmosphere. All in one place."
                  : view === "scenes"
                    ? "Find a familiar feeling, or save something new."
                    : view === "activity"
                      ? "Confirmed changes and the moments that need your attention."
                      : "Manage your connections and make room for what’s next."}
              </p>
            </div>
            <button
              onClick={() => {
                setDialog("connect");
                setQR(null);
              }}
              {...stylex.props(ui.button, ui.primary)}
            >
              <Plus size={16} />
              {state.connected ? "Manage connection" : "Connect a device"}
            </button>
          </div>
          {notice ? (
            <div
              role={notice.error ? "alert" : "status"}
              {...stylex.props(s.notice, notice.error && s.noticeError)}
            >
              <span>{busy ? "Working…" : notice.text}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice(null)}
                {...stylex.props(s.dismiss)}
              >
                <X size={16} />
              </button>
            </div>
          ) : null}
          {stale ? (
            <p role="status" {...stylex.props(s.stale)}>
              Connection interrupted. Showing the last known state. Use Refresh to try again.
            </p>
          ) : null}
          {view === "devices" ? (
            <>
              <div {...stylex.props(s.summary)}>
                <div {...stylex.props(s.summaryItem)}>
                  <span {...stylex.props(s.statIcon)}>
                    <House size={17} />
                  </span>
                  <div>
                    <strong {...stylex.props(s.statValue)}>
                      {shownDevices.length.toString().padStart(2, "0")}
                    </strong>
                    <small {...stylex.props(s.statLabel)}>Connected devices</small>
                  </div>
                </div>
                <div {...stylex.props(s.summaryItem)}>
                  <span {...stylex.props(s.statIcon)}>
                    <Wifi size={17} />
                  </span>
                  <div>
                    <strong {...stylex.props(s.statValue)}>
                      {online.toString().padStart(2, "0")}
                    </strong>
                    <small {...stylex.props(s.statLabel)}>Responding devices</small>
                  </div>
                </div>
                <div {...stylex.props(s.summaryItem)}>
                  <span {...stylex.props(s.statIcon)}>
                    <Sparkles size={17} />
                  </span>
                  <div>
                    <strong {...stylex.props(s.statValue)}>
                      {scenes.length.toString().padStart(2, "0")}
                    </strong>
                    <small {...stylex.props(s.statLabel)}>Favorite moods</small>
                  </div>
                </div>
                <div {...stylex.props(s.summaryNote)}>
                  <span {...stylex.props(s.statusDot(state.connected))} />
                  {state.connected ? "Your home is connected" : "Your home starts here"}
                </div>
              </div>
              <div {...stylex.props(s.filterRow)}>
                <div {...stylex.props(s.rooms)}>
                  {rooms.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoom(r)}
                      aria-pressed={room === r}
                      {...stylex.props(s.room, room === r && s.roomActive)}
                    >
                      {r}
                      {r === "All rooms" ? <span>{shownDevices.length}</span> : null}
                    </button>
                  ))}
                </div>
                <button
                  disabled={busy || !state.connected}
                  onClick={() =>
                    void task(
                      {
                        type: "discover",
                      },
                      "Device list refreshed.",
                    )
                  }
                  {...stylex.props(ui.button, ui.ghost)}
                >
                  <RefreshCw size={14} />
                  Find devices
                </button>
              </div>
              {shownDevices.length ? (
                <div {...stylex.props(s.controlGrid)}>
                  <div>
                    <div {...stylex.props(s.deviceList)}>
                      {visible.map((d) => (
                        <button
                          key={d.id}
                          aria-pressed={device?.id === d.id}
                          onClick={() => {
                            setSelected(d.id);
                            if (!d.updatedAt)
                              void task({
                                type: "refresh",
                                id: d.id,
                              });
                          }}
                          {...stylex.props(s.deviceItem, device?.id === d.id && s.deviceSelected)}
                        >
                          <span {...stylex.props(s.deviceIcon)}>
                            {d.kind === "fan" ? <Fan size={20} /> : <Lightbulb size={20} />}
                          </span>
                          <span {...stylex.props(s.deviceText)}>
                            {d.name}
                            <small>
                              {d.room} · {d.model}
                            </small>
                          </span>
                          <span {...stylex.props(s.deviceState)}>
                            <span {...stylex.props(s.statusDot(d.online && d.updatedAt > 0))} />
                            {d.updatedAt
                              ? d.online
                                ? d.state.power
                                  ? "On"
                                  : "Off"
                                : "Offline"
                              : "Unverified"}
                          </span>
                        </button>
                      ))}
                    </div>
                    {device?.kind === "fan" ? (
                      <FanAtmosphere device={device} />
                    ) : device?.kind === "light" ? (
                      <Atmosphere
                        device={device}
                        busy={busy}
                        onRefresh={() =>
                          void task(
                            {
                              type: "refresh",
                              id: device.id,
                            },
                            "State refreshed from the bulb.",
                          )
                        }
                      />
                    ) : null}
                  </div>
                  {device?.kind === "fan" ? (
                    <FanControls
                      key={`${device.id}:${device.updatedAt}`}
                      device={device}
                      busy={busy}
                      onCommand={command}
                      onSettings={() => setDialog("device")}
                      onRefresh={() =>
                        void task({ type: "refresh", id: device.id }, "Fan state refreshed.")
                      }
                    />
                  ) : device ? (
                    <LightControls
                      key={`${device.id}:${device.updatedAt}`}
                      device={device}
                      busy={busy}
                      onCommand={command}
                      onSave={() => setDialog("save")}
                      onSettings={() => setDialog("device")}
                    />
                  ) : null}
                </div>
              ) : (
                <div {...stylex.props(s.empty)}>
                  <div {...stylex.props(s.emptyCopy)}>
                    <span {...stylex.props(ui.badge)}>
                      <Lightbulb size={12} />
                      FIRST, A LITTLE LIGHT
                    </span>
                    <h2 {...stylex.props(s.emptyTitle)}>
                      Every home starts
                      <br />
                      with a feeling.
                    </h2>
                    <p {...stylex.props(s.emptyDescription)}>
                      Bring your lights and fan into Jarvis.
                      <br />A warmer evening is just a connection away.
                    </p>
                    <button
                      disabled={busy}
                      onClick={() =>
                        state.connected
                          ? void task(
                              {
                                type: "discover",
                              },
                              "Device search complete.",
                            )
                          : setDialog("connect")
                      }
                      {...stylex.props(ui.button, ui.primary)}
                    >
                      {state.connected ? "Find my devices" : "Connect Xiaomi Home"}
                      <ArrowUpRight size={16} />
                    </button>
                    {state.devices.some((d) => d.hidden) ? (
                      <button
                        onClick={() => setView("settings")}
                        {...stylex.props(ui.button, ui.ghost)}
                      >
                        Manage hidden devices
                      </button>
                    ) : null}
                    <p {...stylex.props(s.emptyFoot)}>LIGHTS & FANS · XIAOMI HOME</p>
                  </div>
                  <div {...stylex.props(s.emptyArt)} aria-hidden="true">
                    <div {...stylex.props(s.halo)} />
                    <div {...stylex.props(s.stem)} />
                    <div {...stylex.props(s.lamp)} />
                    <div {...stylex.props(s.lampBase)} />
                    <div {...stylex.props(s.orbit)} />
                    <span {...stylex.props(s.artCaption)}>a softer kind of smart.</span>
                  </div>
                </div>
              )}
              {device?.kind !== "fan" ? (
                <SceneSection
                  scenes={scenes.slice(0, 4)}
                  device={device?.kind === "light" ? device : undefined}
                  busy={busy}
                  onApply={applyScene}
                  onView={() => setView("scenes")}
                />
              ) : null}
            </>
          ) : null}
          {view === "scenes" ? (
            <>
              <div {...stylex.props(s.sceneToolbar)}>
                <label {...stylex.props(ui.label)}>
                  Apply scenes to
                  <select
                    {...stylex.props(ui.input)}
                    value={device?.id ?? ""}
                    onChange={(e) => setSelected(e.target.value)}
                    disabled={!lights.length}
                  >
                    {lights.length ? (
                      lights.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))
                    ) : (
                      <option>No connected lights</option>
                    )}
                  </select>
                </label>
                <button
                  disabled={
                    device?.kind !== "light" || !device.online || !device.state.power || busy
                  }
                  onClick={() => setDialog("save")}
                  {...stylex.props(ui.button)}
                >
                  <Plus size={15} />
                  Save current light
                </button>
              </div>
              <SceneSection
                scenes={scenes}
                device={device?.kind === "light" ? device : undefined}
                busy={busy}
                onApply={applyScene}
              />
              {state.scenes.length ? (
                <div {...stylex.props(s.savedList)}>
                  <h2 {...stylex.props(ui.sectionTitle)}>Your saved scenes</h2>
                  {state.scenes.map((scene) => (
                    <div key={scene.id} {...stylex.props(ui.row)}>
                      <span>{scene.name}</span>
                      <button
                        aria-label={`Delete ${scene.name}`}
                        disabled={busy}
                        onClick={() =>
                          void task(
                            {
                              type: "deleteScene",
                              id: scene.id,
                            },
                            "Scene removed.",
                          )
                        }
                        {...stylex.props(ui.button, ui.ghost)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
          {view === "activity" ? (
            <section {...stylex.props(s.activity)}>
              <h2 {...stylex.props(ui.sectionTitle)}>Recent activity</h2>
              {state.activity.length ? (
                state.activity.map((event) => (
                  <div key={event.id} {...stylex.props(s.event)}>
                    <span {...stylex.props(s.eventIcon, event.status === "error" && s.eventError)}>
                      {event.status === "success" ? <Check size={16} /> : <X size={16} />}
                    </span>
                    <div {...stylex.props(s.eventText)}>
                      {event.label}
                      <small>{event.deviceName}</small>
                    </div>
                    <time
                      {...stylex.props(ui.muted)}
                      dateTime={new Date(event.createdAt).toISOString()}
                    >
                      {new Date(event.createdAt).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                ))
              ) : (
                <div {...stylex.props(s.activityEmpty)}>
                  <ActivityIcon size={28} />
                  <h3>Nothing to catch up on.</h3>
                  <p {...stylex.props(ui.muted)}>Your confirmed device changes will appear here.</p>
                </div>
              )}
              <p {...stylex.props(ui.muted)}>Showing the latest 40 events · Philippine time</p>
            </section>
          ) : null}
          {view === "settings" ? (
            <div {...stylex.props(s.settingsGrid)}>
              <section {...stylex.props(s.settingsCard)}>
                <div {...stylex.props(ui.row)}>
                  <span {...stylex.props(s.xiaomi)}>mi</span>
                  <span {...stylex.props(ui.badge)}>
                    {state.connected ? "Connected" : "Not connected"}
                  </span>
                </div>
                <h2 {...stylex.props(s.settingsTitle)}>Xiaomi Home</h2>
                <p {...stylex.props(ui.muted)}>
                  Yeelight lighting and Mi Smart Standing Fan 2 controls. Connect through Xiaomi
                  Home to control them from anywhere.
                </p>
                <div {...stylex.props(s.settingsActions)}>
                  <button
                    disabled={busy}
                    onClick={() => setDialog("connect")}
                    {...stylex.props(ui.button, ui.primary)}
                  >
                    {state.connected ? "Reconnect account" : "Connect account"}
                    <ArrowUpRight size={15} />
                  </button>
                  {state.connected ? (
                    <button
                      disabled={busy}
                      onClick={() => setDialog("disconnect")}
                      {...stylex.props(ui.button, ui.ghost)}
                    >
                      Disconnect
                    </button>
                  ) : null}
                </div>
                <p {...stylex.props(s.integrationDetail)}>
                  Region:{" "}
                  {state.region === "sg" ? "Singapore / Philippines" : state.region.toUpperCase()}
                  <br />
                  Credentials encrypted at rest · Cloud connection
                </p>
                <div {...stylex.props(s.settingsActions)}>
                  <button onClick={() => setDialog("help")} {...stylex.props(ui.button, ui.ghost)}>
                    <CircleHelp size={15} /> Help
                  </button>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      await request({ type: "logout" });
                      window.location.reload();
                    }}
                    {...stylex.props(ui.button, ui.ghost)}
                  >
                    <LogOut size={15} /> Sign out of Jarvis
                  </button>
                </div>
              </section>
              <section {...stylex.props(s.settingsCard)}>
                <EyeOff size={26} />
                <h2 {...stylex.props(s.settingsTitle)}>Hidden devices</h2>
                <p {...stylex.props(ui.muted)}>
                  Hidden devices stay connected. Restore them here whenever you need them.
                </p>
                <div {...stylex.props(ui.stack)}>
                  {state.devices
                    .filter((d) => d.hidden)
                    .map((d) => (
                      <div key={d.id} {...stylex.props(ui.row)}>
                        <span>
                          {d.name}
                          <small {...stylex.props(ui.muted)}>{d.room}</small>
                        </span>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void task(
                              { type: "visibility", id: d.id, hidden: false },
                              "Device restored.",
                            )
                          }
                          {...stylex.props(ui.button)}
                        >
                          Restore {d.name}
                        </button>
                      </div>
                    ))}
                  {!state.devices.some((d) => d.hidden) ? (
                    <p {...stylex.props(ui.muted)}>
                      No hidden devices. Use Device settings to hide one.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}
          <footer {...stylex.props(s.footer)}>
            <span>
              <span {...stylex.props(s.tinyLogo)}>j</span> Designed for the way you live.
            </span>
            <span>YOUR HOME, IN HARMONY.</span>
          </footer>
        </main>
      </div>
      {dialog === "connect" ? (
        <Modal
          title={state.connected ? "Your Xiaomi connection" : "Bring your light home"}
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
                <div {...stylex.props(s.qr)}>
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
        <Modal title="Keep this feeling" onClose={closeDialog}>
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
        <Modal title="Make it yours" onClose={closeDialog}>
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
                setRoom("All rooms");
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
                  setRoom("All rooms");
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
        <Modal title="A little help" onClose={closeDialog}>
          <div {...stylex.props(ui.stack)}>
            <p {...stylex.props(ui.muted)}>
              <strong>Connect your light</strong>
              <br />
              Add your Yeelight to Xiaomi Home first. Then connect the same Xiaomi account in
              Jarvis. Your bulb must be powered and online.
            </p>
            <p {...stylex.props(ui.muted)}>
              <strong>Keep things current</strong>
              <br />
              Jarvis checks the selected bulb every minute while this page is visible. Use Refresh
              for an immediate reading. A timeout may mean a command arrived but its confirmation
              did not; refresh before retrying.
            </p>
            <p {...stylex.props(ui.muted)}>
              <strong>Still in Xiaomi Home</strong>
              <br />
              Wi-Fi setup, firmware, sharing, music sync and recurring automations. Support for
              other devices is coming as new integrations are built.
            </p>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
function SceneSection({
  scenes,
  device,
  busy,
  onApply,
  onView,
}: {
  scenes: Scene[];
  device?: LightDevice;
  busy: boolean;
  onApply: (scene: Scene) => void;
  onView?: () => void;
}) {
  return (
    <section {...stylex.props(s.scenes)}>
      <div {...stylex.props(s.scenesHeading)}>
        <div>
          <h2 {...stylex.props(ui.sectionTitle)}>Set the mood</h2>
          <p {...stylex.props(s.sceneSubtitle)}>
            {device
              ? `One tap. A different feeling for ${device.name}.`
              : "Your favorite moments, ready when your light is."}
          </p>
        </div>
        {onView ? (
          <button onClick={onView} {...stylex.props(ui.button, ui.ghost)}>
            All scenes
            <ArrowUpRight size={14} />
          </button>
        ) : null}
      </div>
      <div {...stylex.props(s.sceneGrid)}>
        {scenes.map((scene) => (
          <button
            key={scene.id}
            disabled={busy || !device?.online || !device?.updatedAt}
            onClick={() => onApply(scene)}
            {...stylex.props(s.scene(scene.color))}
          >
            <span {...stylex.props(s.sceneTop)}>
              <span {...stylex.props(s.sceneGlyph(scene.color))}>
                {scene.mode === "white" ? <Sun size={23} /> : <Sparkles size={22} />}
              </span>
              <ArrowUpRight size={14} />
            </span>
            <strong {...stylex.props(s.sceneName)}>{scene.name}</strong>
            <span {...stylex.props(s.sceneDescription)}>{scene.description}</span>
            <span {...stylex.props(s.sceneMeta)}>
              {scene.mode === "white" ? `${scene.kelvin}K` : "COLOR"}
              <span>·</span>
              {scene.brightness}% BRIGHTNESS
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
function FanAtmosphere({ device }: { device: FanDevice }) {
  const ready = device.online && device.updatedAt > 0;
  return (
    <section {...stylex.props(s.atmosphere)}>
      <div {...stylex.props(s.atmosphereHeader)}>
        <span {...stylex.props(s.eyebrow)}>A BREATH OF FRESH AIR</span>
        <span {...stylex.props(ui.badge)}>
          <span {...stylex.props(s.statusDot(ready && device.state.power))} />
          {ready ? (device.state.power ? "FAN IS ON" : "FAN IS OFF") : "UNAVAILABLE"}
        </span>
      </div>
      <div {...stylex.props(s.fanStage)} aria-hidden="true">
        <Fan size={160} strokeWidth={0.8} />
      </div>
      <div {...stylex.props(s.atmosphereBottom)}>
        <div>
          <h3 {...stylex.props(s.atmosphereTitle)}>
            {ready
              ? device.state.mode === "natural"
                ? "Let the breeze in."
                : "Steady, easy comfort."
              : "A little out of reach."}
          </h3>
          <p {...stylex.props(s.atmosphereMeta)}>
            {ready
              ? `${device.state.speed}% speed · ${device.state.oscillating ? `${device.state.angle}° oscillation` : "Fixed direction"}`
              : "Refresh to read the fan’s current state."}
          </p>
        </div>
      </div>
    </section>
  );
}
function Atmosphere({
  device,
  busy,
  onRefresh,
}: {
  device: LightDevice;
  busy: boolean;
  onRefresh: () => void;
}) {
  const state = device.state,
    active = device.online && device.updatedAt > 0 && state.power,
    color =
      state.mode === "color"
        ? state.color
        : state.kelvin < 3500
          ? "#edbc78"
          : state.kelvin > 5000
            ? "#c1def5"
            : "#e3ddbb";
  return (
    <section {...stylex.props(s.atmosphere)}>
      <div {...stylex.props(s.atmosphereHeader)}>
        <span {...stylex.props(s.eyebrow)}>THE ATMOSPHERE</span>
        <span {...stylex.props(ui.badge)}>
          <span {...stylex.props(s.statusDot(active))} />
          {device.online
            ? device.updatedAt
              ? state.power
                ? "LIGHT IS ON"
                : "LIGHT IS OFF"
              : "UNVERIFIED"
            : "OFFLINE"}
        </span>
      </div>
      <div {...stylex.props(s.bulbStage)} aria-hidden="true">
        <div {...stylex.props(s.bulbGlow(active ? color : "#283124"))} />
        <div {...stylex.props(s.bulbGlass(active ? color : "#56604e"))} />
        <div {...stylex.props(s.bulbSocket)} />
        <div {...stylex.props(s.bulbTip)} />
        <div {...stylex.props(s.bulbRing)} />
      </div>
      <div {...stylex.props(s.atmosphereBottom)}>
        <div>
          <h3 {...stylex.props(s.atmosphereTitle)}>
            {!device.online
              ? "A little out of reach."
              : !device.updatedAt
                ? "Let’s check in."
                : active
                  ? "Just the way you like it."
                  : "Resting, for now."}
          </h3>
          <p {...stylex.props(s.atmosphereMeta)}>
            {device.updatedAt
              ? `Last checked ${new Date(device.updatedAt).toLocaleTimeString("en-PH", {
                  timeZone: "Asia/Manila",
                  hour: "numeric",
                  minute: "2-digit",
                })} · ${state.mode === "white" ? `${state.kelvin} K` : "Color mode"}`
              : "Refresh to read the actual light state."}
          </p>
        </div>
        <button
          disabled={busy}
          aria-label="Refresh light state"
          onClick={onRefresh}
          {...stylex.props(ui.button, ui.ghost)}
        >
          <RefreshCw size={15} />
        </button>
      </div>
    </section>
  );
}
const s = stylex.create({
  fanStage: {
    display: "grid",
    placeItems: "center",
    height: 300,
    color: "#b8cda2",
    backgroundImage: "radial-gradient(circle, #34492b 0%, transparent 65%)",
  },
  app: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: {
      default: "row",
      "@media(max-width:760px)": "column",
    },
    backgroundColor: "#111612",
  },
  skip: {
    position: "fixed",
    top: {
      default: -80,
      ":focus": 10,
    },
    left: 20,
    zIndex: 100,
    padding: 12,
    backgroundColor: "#d8edaa",
    color: "#202c19",
  },
  sidebar: {
    width: {
      default: 228,
      "@media(min-width:761px) and (max-width:1050px)": 190,
      "@media(max-width:760px)": "100%",
    },
    position: {
      default: "fixed",
      "@media(max-width:760px)": "relative",
    },
    height: {
      default: "100dvh",
      "@media(max-width:760px)": "auto",
    },
    insetBlockStart: 0,
    insetInlineStart: 0,
    padding: {
      default: "33px 18px 18px",
      "@media(max-width:760px)": "18px 20px 0",
    },
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: "#2c3528",
    backgroundColor: "#151b15",
    display: "flex",
    flexDirection: "column",
    zIndex: 5,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 27,
    fontWeight: 600,
    letterSpacing: -1,
    marginLeft: 12,
  },
  logo: {
    display: "grid",
    placeItems: "center",
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#d8edaa",
    color: "#202b18",
    fontSize: 28,
    paddingBottom: 5,
  },
  brandDot: {
    alignSelf: "start",
    fontSize: 9,
    marginLeft: -5,
    marginTop: 3,
    color: "#8d9b82",
  },
  home: {
    display: {
      default: "flex",
      "@media(max-width:760px)": "none",
    },
    alignItems: "center",
    gap: 10,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#343e2f",
    borderRadius: 11,
    paddingBlock: "13px",
    paddingInline: "10px",
    marginTop: 35,
    marginBottom: 32,
    fontSize: 12,
  },
  homeIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    display: "grid",
    placeItems: "center",
    color: "#a8b89a",
    backgroundColor: "#2c3827",
  },
  homeSmall: {
    display: "block",
    fontSize: 9,
    color: "#7f8d74",
    marginTop: 5,
  },
  navLabel: {
    display: {
      default: "block",
      "@media(max-width:760px)": "none",
    },
    color: "#5e7058",
    fontSize: 8,
    letterSpacing: 1.8,
    marginLeft: 12,
    marginBottom: 16,
  },
  nav: {
    display: "flex",
    flexDirection: {
      default: "column",
      "@media(max-width:760px)": "row",
    },
    gap: 7,
    marginTop: {
      default: 0,
      "@media(max-width:760px)": 18,
    },
  },
  navItem: {
    display: "flex",
    flexDirection: { default: "row", "@media(max-width:760px)": "column" },
    minWidth: 0,
    alignItems: "center",
    gap: { default: 11, "@media(max-width:760px)": 6 },
    padding: {
      default: "13px 13px",
      "@media(max-width:760px)": "12px 6px",
    },
    borderWidth: 0,
    borderStyle: "solid",
    borderRadius: "8px",
    backgroundColor: {
      default: "transparent",
      ":hover": "#283322",
    },
    color: "#8c9b80",
    fontSize: 12,
    flexGrow: {
      default: 0,
      "@media(max-width:760px)": 1,
    },
    justifyContent: {
      default: "initial",
      "@media(max-width:760px)": "center",
    },
  },
  navActive: {
    backgroundColor: "#d8edaa",
    color: "#28381d",
  },
  count: {
    fontSize: 9,
    paddingBlock: "3px",
    paddingInline: "6px",
    borderRadius: 4,
    backgroundColor: "#516b2320",
    marginLeft: "auto",
    display: {
      default: "block",
      "@media(max-width:760px)": "none",
    },
  },
  sidebarBottom: {
    marginTop: "auto",
    display: {
      default: "block",
      "@media(max-width:760px)": "none",
    },
  },
  quietCard: {
    paddingBlock: "20px",
    paddingInline: "15px",
    marginBottom: 18,
    backgroundImage: "linear-gradient(135deg, #34472950, #1b251900)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#37472d",
    borderRadius: 10,
    color: "#bdcbaa",
    fontSize: 12,
    lineHeight: 2,
  },
  smallDot: {
    display: "block",
    width: 5,
    height: 5,
    backgroundColor: "#b8d993",
    borderRadius: "50%",
    marginBottom: 11,
  },
  help: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    width: "100%",
    paddingBlock: "10px",
    paddingInline: "12px",
    borderWidth: 0,
    borderStyle: "solid",
    backgroundColor: "transparent",
    color: "#829276",
    fontSize: 11,
  },
  profile: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "#2e3928",
    paddingTop: 20,
    marginTop: 16,
    fontSize: 11,
  },
  avatar: {
    display: "grid",
    placeItems: "center",
    backgroundColor: "#3d4932",
    width: 30,
    height: 30,
    borderRadius: "50%",
    color: "#d0dcb9",
    fontSize: 11,
  },
  workspace: {
    marginLeft: {
      default: 228,
      "@media(min-width:761px) and (max-width:1050px)": 190,
      "@media(max-width:760px)": 0,
    },
    width: {
      default: "calc(100% - 228px)",
      "@media(min-width:761px) and (max-width:1050px)": "calc(100% - 190px)",
      "@media(max-width:760px)": "100%",
    },
  },
  topbar: {
    height: 73,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#2b3527",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingInline: {
      default: 40,
      "@media(max-width:900px)": 24,
    },
  },
  breadcrumb: {
    display: "flex",
    gap: 12,
    color: "#73866b",
    fontSize: 11,
  },
  private: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#839578",
    fontSize: 10,
  },
  main: {
    padding: {
      default: "40px 40px 20px",
      "@media(min-width:501px) and (max-width:1100px)": "32px 24px 20px",
      "@media(max-width:500px)": "25px 18px 16px",
    },
    maxWidth: 1500,
    marginInline: "auto",
  },
  heading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 25,
    flexWrap: "wrap",
    marginBottom: 30,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.8,
    color: "#839877",
    marginBottom: 12,
  },
  title: {
    fontSize: {
      default: 36,
      "@media(max-width:600px)": 30,
    },
    lineHeight: 1.2,
    fontWeight: 400,
    letterSpacing: -1.3,
  },
  subtitle: {
    fontSize: 12,
    color: "#819574",
    lineHeight: 1.8,
    marginTop: 12,
  },
  summary: {
    display: "flex",
    alignItems: "center",
    gap: {
      default: 38,
      "@media(max-width:1050px)": 20,
    },
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#2e3a28",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#2e3a28",
    paddingBlock: 22,
    flexWrap: "wrap",
    marginBottom: 28,
  },
  summaryItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  statIcon: {
    color: "#9aaa8b",
    display: "grid",
    placeItems: "center",
    width: 38,
    height: 38,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#36452d",
    borderRadius: 10,
  },
  statValue: {
    display: "block",
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1,
  },
  statLabel: {
    display: "block",
    fontSize: 9,
    color: "#7d9270",
    marginTop: 7,
  },
  summaryNote: {
    marginLeft: "auto",
    fontSize: 10,
    color: "#8aa179",
    display: {
      default: "flex",
      "@media(max-width:1100px)": "none",
    },
    alignItems: "center",
    gap: 7,
  },
  statusDot: (on: boolean) => ({
    width: 5,
    height: 5,
    display: "inline-block",
    borderRadius: "50%",
    backgroundColor: on ? "#bad99d" : "#6b7464",
    flexShrink: 0,
  }),
  filterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 22,
  },
  rooms: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
  },
  room: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    paddingBlock: "9px",
    paddingInline: "13px",
    borderRadius: 7,
    color: "#859b77",
    backgroundColor: "transparent",
    fontSize: 10,
    whiteSpace: "nowrap",
  },
  roomActive: {
    borderColor: "#4c603f",
    backgroundColor: "#283720",
    color: "#d9e9c9",
  },
  controlGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1.2fr) minmax(330px, 1fr)",
      "@media(max-width:1100px)": "1fr",
    },
    gap: 22,
    alignItems: "start",
  },
  deviceList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 18,
  },
  deviceItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: 16,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#36452d",
    borderRadius: 12,
    backgroundColor: "#1a2417",
    color: "#d5e6c5",
    textAlign: "left",
  },
  deviceSelected: {
    borderColor: "#819760",
    backgroundColor: "#26321e",
  },
  deviceIcon: {
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    backgroundColor: "#8b9d5c1a",
    color: "#d4deaa",
    borderRadius: 10,
  },
  deviceText: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    fontSize: 13,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  deviceState: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 10,
    color: "#acbe99",
  },
  empty: {
    position: "relative",
    overflow: "hidden",
    minHeight: 360,
    display: "grid",
    gridTemplateColumns: {
      default: "1fr 1fr",
      "@media(max-width:600px)": "1fr",
    },
    backgroundImage: "linear-gradient(115deg,#202c1c,#1c2719 65%,#28341e)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#3c4d30",
    borderRadius: 18,
  },
  emptyCopy: {
    padding: {
      default: "35px 35px",
      "@media(max-width:600px)": "26px",
    },
    zIndex: 1,
  },
  emptyTitle: {
    fontWeight: 400,
    letterSpacing: -1,
    fontSize: 35,
    lineHeight: 1.15,
    marginTop: 25,
  },
  emptyDescription: {
    fontSize: 12,
    color: "#9eaf8c",
    lineHeight: 1.9,
    marginTop: 15,
    marginBottom: 24,
  },
  emptyFoot: {
    fontSize: 8,
    color: "#687f59",
    letterSpacing: 1.3,
    marginTop: 24,
  },
  emptyArt: {
    position: "relative",
    display: {
      default: "block",
      "@media(max-width:600px)": "none",
    },
  },
  halo: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: "50%",
    top: 0,
    left: -60,
    backgroundImage: "radial-gradient(circle,#c6cb6650,transparent 65%)",
  },
  stem: {
    position: "absolute",
    height: 130,
    width: 4,
    backgroundImage: "linear-gradient(#6c7654,#b3b87b)",
    top: 160,
    left: "50%",
  },
  lamp: {
    position: "absolute",
    top: 95,
    left: "calc(50% - 78px)",
    width: 156,
    height: 103,
    borderTopLeftRadius: "90px",
    borderTopRightRadius: "90px",
    borderBottomRightRadius: "12px",
    borderBottomLeftRadius: "12px",
    backgroundImage: "linear-gradient(120deg,#b7bd8b,#6c794e 70%,#444f30)",
    boxShadow: "0 10px 25px #bdc67420",
  },
  lampBase: {
    position: "absolute",
    width: 100,
    height: 18,
    borderRadius: "50%",
    backgroundImage: "linear-gradient(#8e9b69,#495a35)",
    top: 282,
    left: "calc(50% - 49px)",
  },
  orbit: {
    position: "absolute",
    top: 250,
    left: "calc(50% - 125px)",
    width: 250,
    height: 90,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#62744644",
    borderRadius: "50%",
  },
  artCaption: {
    position: "absolute",
    bottom: 30,
    left: "50%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    fontSize: 11,
    color: "#728965",
    fontStyle: "italic",
  },
  atmosphere: {
    position: "relative",
    overflow: "hidden",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#3c4b30",
    borderRadius: 16,
    backgroundImage: "linear-gradient(130deg,#27321f,#1a2418)",
    padding: 22,
  },
  atmosphereHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
  },
  bulbStage: {
    height: 270,
    position: "relative",
  },
  bulbGlow: (color: string) => ({
    position: "absolute",
    width: 330,
    height: 330,
    left: "calc(50% - 165px)",
    top: -15,
    borderRadius: "50%",
    backgroundImage: `radial-gradient(circle, ${color}40, transparent 65%)`,
  }),
  bulbGlass: (color: string) => ({
    position: "absolute",
    width: 100,
    height: 108,
    left: "calc(50% - 50px)",
    top: 55,
    borderRadius: "50% 50% 35% 35%",
    backgroundImage: `linear-gradient(140deg,#ffffffdd, ${color} 60%, ${color}88)`,
    boxShadow: `0 0 35px ${color}24`,
  }),
  bulbSocket: {
    position: "absolute",
    width: 57,
    height: 50,
    top: 150,
    left: "calc(50% - 28px)",
    backgroundImage: "repeating-linear-gradient(0deg,#6e7862 0px,#b7bea2 5px,#717b62 8px)",
    clipPath: "polygon(0 0,100% 0,85% 100%,15% 100%)",
  },
  bulbTip: {
    position: "absolute",
    width: 30,
    height: 12,
    borderTopLeftRadius: "0",
    borderTopRightRadius: "0",
    borderBottomRightRadius: "10px",
    borderBottomLeftRadius: "10px",
    top: 199,
    left: "calc(50% - 15px)",
    backgroundColor: "#58644c",
  },
  bulbRing: {
    position: "absolute",
    width: 220,
    height: 50,
    top: 225,
    left: "calc(50% - 110px)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#56674355",
    borderRadius: "50%",
  },
  atmosphereBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "#3b4c2f",
    paddingTop: 22,
  },
  atmosphereTitle: {
    fontWeight: 400,
    fontSize: 18,
    letterSpacing: -0.4,
  },
  atmosphereMeta: {
    fontSize: 10,
    color: "#829572",
    marginTop: 10,
  },
  scenes: {
    marginTop: 32,
  },
  scenesHeading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    marginBottom: 20,
  },
  sceneSubtitle: {
    fontSize: 11,
    color: "#7f9571",
    marginTop: 8,
    lineHeight: 1.7,
  },
  sceneGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(4,minmax(0,1fr))",
      "@media(min-width:451px) and (max-width:1200px)": "repeat(2,minmax(0,1fr))",
      "@media(max-width:450px)": "1fr",
    },
    gap: 12,
  },
  scene: (color: string) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    textAlign: "left",
    padding: 19,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: `${color}30`,
      ":hover": `${color}99`,
    },
    borderRadius: 13,
    backgroundColor: "#1a2217",
    backgroundImage: `linear-gradient(125deg,${color}16,#1a2217)`,
    color: "#d4dfc8",
    minHeight: 168,
    transition: "border-color .2s",
    opacity: {
      default: 1,
      ":disabled": 0.68,
    },
  }),
  sceneTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#829277",
    marginBottom: 22,
  },
  sceneGlyph: (color: string) => ({
    color,
    display: "flex",
  }),
  sceneName: {
    fontWeight: 500,
    fontSize: 13,
    marginBottom: 8,
  },
  sceneDescription: {
    fontSize: 9,
    color: "#879a79",
    lineHeight: 1.8,
    minHeight: 32,
  },
  sceneMeta: {
    display: "flex",
    gap: 6,
    fontSize: 7,
    letterSpacing: 1,
    color: "#6c825e",
    marginTop: 15,
  },
  sceneToolbar: {
    display: "flex",
    alignItems: "end",
    gap: 20,
    flexWrap: "wrap",
    marginBlock: 30,
  },
  savedList: {
    display: "flex",
    flexDirection: "column",
    gap: 15,
    maxWidth: 480,
    marginTop: 35,
  },
  activity: {
    backgroundColor: "#1a2217",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#36482b",
    borderRadius: 16,
    padding: 26,
  },
  event: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    paddingBlock: 20,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#344529",
    flexWrap: "wrap",
  },
  eventIcon: {
    display: "grid",
    placeItems: "center",
    width: 30,
    height: 30,
    borderRadius: "50%",
    color: "#afca90",
    backgroundColor: "#2e3f24",
  },
  eventError: {
    color: "#e9ac95",
    backgroundColor: "#3b2e23",
  },
  eventText: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    fontSize: 12,
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  activityEmpty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
    color: "#879d75",
    paddingBlock: 75,
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr 1fr",
      "@media(max-width:950px)": "1fr",
    },
    gap: 20,
    marginTop: 35,
  },
  settingsCard: {
    padding: 28,
    backgroundColor: "#1b2518",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#394b2d",
    borderRadius: 16,
  },
  xiaomi: {
    display: "grid",
    placeItems: "center",
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#ff731d",
    color: "#fff",
    fontWeight: 700,
    fontSize: 25,
    letterSpacing: -3,
    paddingRight: 3,
  },
  settingsTitle: {
    fontSize: 23,
    fontWeight: 400,
    marginBlock: 22,
    letterSpacing: -0.6,
  },
  settingsActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 25,
  },
  integrationDetail: {
    color: "#6d865d",
    fontSize: 10,
    lineHeight: 2,
    marginTop: 26,
  },
  futureCard: {
    backgroundColor: "transparent",
    borderStyle: "dashed",
    color: "#8da879",
  },
  futureTags: {
    display: "flex",
    gap: 15,
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 40,
    color: "#6f865e",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    marginTop: 45,
    paddingTop: 20,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "#2d3b24",
    fontSize: 8,
    color: "#596f4b",
    letterSpacing: 1,
  },
  tinyLogo: {
    fontSize: 17,
    color: "#829666",
    marginRight: 8,
  },
  notice: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    paddingBlock: "13px",
    paddingInline: "16px",
    backgroundColor: "#293d20",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a6538",
    borderRadius: 10,
    color: "#c7dfad",
    fontSize: 12,
    marginBottom: 20,
    lineHeight: 1.6,
  },
  noticeError: {
    backgroundColor: "#352b23",
    borderColor: "#75513c",
    color: "#e3b89e",
  },
  dismiss: {
    display: "flex",
    padding: 5,
    borderWidth: 0,
    borderStyle: "solid",
    color: "inherit",
    backgroundColor: "transparent",
  },
  stale: {
    fontSize: 12,
    color: "#d7b285",
    marginBottom: 20,
  },
  qr: {
    display: "flex",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    alignSelf: "center",
  },
});
