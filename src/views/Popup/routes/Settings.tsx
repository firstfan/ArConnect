import React, { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  XIcon
} from "@primer/octicons-react";
import {
  Button,
  Input,
  Radio,
  Spacer,
  Toggle,
  useInput
} from "@geist-ui/react";
import { goTo } from "react-chrome-extension-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../stores/reducers";
import { getRealURL } from "../../../utils/url";
import { Currency } from "../../../stores/reducers/settings";
import { Threshold } from "arverify";
import { MessageType } from "../../../utils/messenger";
import {
  readdAsset,
  removePermissions,
  unblockURL,
  blockURL,
  updateArweaveConfig,
  updateSettings,
  toggleAllowance,
  setAllowanceLimit,
  removeAllowance
} from "../../../stores/actions";
import Home from "./Home";
import Arweave from "arweave";
import SubPageTopStyles from "../../../styles/components/SubPageTop.module.sass";
import styles from "../../../styles/views/Popup/settings.module.sass";

export default function Settings() {
  const [setting, setCurrSetting] = useState<
      | "events"
      | "permissions"
      | "currency"
      | "psts"
      | "sites"
      | "arweave"
      | "arverify"
      | "allowances"
    >(),
    permissions = useSelector((state: RootState) => state.permissions),
    [opened, setOpened] = useState<{ url: string; opened: boolean }[]>([]),
    dispatch = useDispatch(),
    psts = useSelector((state: RootState) => state.assets),
    currentAddress = useSelector((state: RootState) => state.profile),
    blockedURLs = useSelector((state: RootState) => state.blockedSites),
    addURLInput = useInput(""),
    [events, setEvents] = useState<ArConnectEvent[]>([]),
    arweaveConfig = useSelector((state: RootState) => state.arweave),
    otherSettings = useSelector((state: RootState) => state.settings),
    allowances = useSelector((state: RootState) => state.allowances),
    arweaveHostInput = useInput(arweaveConfig.host),
    arweavePortInput = useInput(arweaveConfig.port.toString()),
    arweaveProtocolInput = useInput(arweaveConfig.protocol),
    [arweave, setArweave] = useState<Arweave>(new Arweave(arweaveConfig)),
    [editingAllowance, setEditingAllowance] = useState<{
      id: number;
      val: number;
    }>();

  useEffect(() => {
    setOpened(permissions.map(({ url }) => ({ url, opened: false })));
    loadEvents();
    // eslint-disable-next-line
  }, []);

  // update instance on config changes
  useEffect(() => setArweave(new Arweave(arweaveConfig)), [arweaveConfig]);

  function open(url: string) {
    setOpened((val) => [
      ...val.filter((permissionGround) => permissionGround.url !== url),
      { url, opened: !isOpened(url) }
    ]);
  }

  function isOpened(url: string) {
    return (
      opened.find((permissionGround) => permissionGround.url === url)?.opened ??
      false
    );
  }

  function filterWithPermission() {
    return permissions.filter(
      (permissionGroup) => permissionGroup.permissions.length > 0
    );
  }

  function removedPSTs() {
    return (
      psts
        .find(({ address }) => address === currentAddress)
        ?.assets.filter(({ removed }) => removed) ?? []
    );
  }

  function blockInputUrl() {
    dispatch(blockURL(addURLInput.state));
  }

  function loadEvents() {
    const evs = localStorage.getItem("arweave_events");
    if (!evs) return;
    setEvents(
      (JSON.parse(evs).val as ArConnectEvent[]).sort((a, b) => b.date - a.date)
    );
  }

  function updateConfig() {
    if (
      arweaveProtocolInput.state === "" ||
      arweavePortInput.state === "" ||
      arweaveHostInput.state === ""
    )
      return;
    dispatch(
      updateArweaveConfig({
        host: arweaveHostInput.state,
        port: Number(arweavePortInput.state),
        protocol: arweaveProtocolInput.state as "http" | "https"
      })
    );
    setCurrSetting(undefined);
  }

  return (
    <>
      <div className={SubPageTopStyles.Head}>
        <div
          className={SubPageTopStyles.Back}
          onClick={() => {
            if (setting) setCurrSetting(undefined);
            else goTo(Home);
          }}
        >
          <ArrowLeftIcon />
        </div>
        <h1>
          {(setting === "events" && "Events") ||
            (setting === "permissions" && "Permissions") ||
            (setting === "currency" && "Currency") ||
            (setting === "psts" && "Removed PSTs") ||
            (setting === "sites" && "Blocked Sites") ||
            (setting === "arweave" && "Arweave Config") ||
            (setting === "arverify" && "ArVerify Config") ||
            (setting === "allowances" && "Allowances") ||
            "Settings"}
        </h1>
      </div>
      <div className={styles.Settings}>
        {(!setting && (
          <>
            <div
              className={styles.Setting}
              onClick={() => setCurrSetting("events")}
            >
              <div>
                <h1>Events</h1>
                <p>View security events</p>
              </div>
              <div className={styles.Arrow}>
                <ChevronRightIcon />
              </div>
            </div>
            <div
              className={styles.Setting}
              onClick={() => setCurrSetting("permissions")}
            >
              <div>
                <h1>Permissions</h1>
                <p>Manage site permissions</p>
              </div>
              <div className={styles.Arrow}>
                <ChevronRightIcon />
              </div>
            </div>
            <div
              className={styles.Setting}
              onClick={() => setCurrSetting("allowances")}
            >
              <div>
                <h1>Allowances</h1>
                <p>Manage spending limits</p>
              </div>
              <div className={styles.Arrow}>
                <ChevronRightIcon />
              </div>
            </div>
            <div
              className={styles.Setting}
              onClick={() => setCurrSetting("currency")}
            >
              <div>
                <h1>Currency</h1>
                <p>Set your local currency</p>
              </div>
              <div className={styles.Arrow}>
                <ChevronRightIcon />
              </div>
            </div>
            <div
              className={styles.Setting}
              onClick={() => setCurrSetting("psts")}
            >
              <div>
                <h1>Removed PSTs</h1>
                <p>Manage removed PSTs</p>
              </div>
              <div className={styles.Arrow}>
                <ChevronRightIcon />
              </div>
            </div>
            <div
              className={styles.Setting}
              onClick={() => setCurrSetting("sites")}
            >
              <div>
                <h1>Blocked Sites</h1>
                <p>Limit access from sites to ArConnect</p>
              </div>
              <div className={styles.Arrow}>
                <ChevronRightIcon />
              </div>
            </div>
            <div
              className={styles.Setting}
              onClick={() => setCurrSetting("arweave")}
            >
              <div>
                <h1>Arweave Config</h1>
                <p>Edit the arweave config variables</p>
              </div>
              <div className={styles.Arrow}>
                <ChevronRightIcon />
              </div>
            </div>
            <div
              className={styles.Setting}
              onClick={() => setCurrSetting("arverify")}
            >
              <div>
                <h1>ArVerify Config</h1>
                <p>Set the verification threshold used</p>
              </div>
              <div className={styles.Arrow}>
                <ChevronRightIcon />
              </div>
            </div>
            <div className={styles.Setting}>
              <div>
                <h1>ARConfetti effect</h1>
                <p>Show animation on wallet usage</p>
              </div>
              <div className={styles.Arrow}>
                <Toggle
                  checked={otherSettings.arConfetti}
                  onChange={() =>
                    dispatch(
                      updateSettings({ arConfetti: !otherSettings.arConfetti })
                    )
                  }
                />
              </div>
            </div>
          </>
        )) ||
          (setting === "permissions" && (
            <>
              {(filterWithPermission().length > 0 &&
                filterWithPermission().map((permissionGroup, i) => (
                  <div key={i}>
                    <div
                      className={styles.Setting + " " + styles.SubSetting}
                      onClick={() => open(permissionGroup.url)}
                    >
                      <h1>{permissionGroup.url}</h1>
                      <div className={styles.Arrow}>
                        {(isOpened(permissionGroup.url) && (
                          <ChevronDownIcon />
                        )) || <ChevronRightIcon />}
                      </div>
                    </div>
                    {isOpened(permissionGroup.url) && (
                      <div className={styles.OptionContent}>
                        {permissionGroup.permissions.map((perm, j) => (
                          <h1 key={j}>
                            {perm}
                            <div
                              className={styles.RemoveOption}
                              onClick={() => {
                                dispatch(
                                  removePermissions(permissionGroup.url, [perm])
                                );
                                if (
                                  permissionGroup.permissions.filter(
                                    (val) => val !== perm
                                  ).length === 0
                                )
                                  dispatch(
                                    removeAllowance(permissionGroup.url)
                                  );
                              }}
                            >
                              <XIcon />
                            </div>
                          </h1>
                        ))}
                      </div>
                    )}
                  </div>
                ))) || <p>No permissions...</p>}
            </>
          )) ||
          (setting === "currency" && (
            <div className={styles.OptionContent}>
              <Radio.Group
                value={otherSettings.currency}
                onChange={(val) =>
                  dispatch(updateSettings({ currency: val as Currency }))
                }
                className={styles.Radio}
              >
                <Radio value="USD">
                  USD
                  <Radio.Description>United States Dollar</Radio.Description>
                </Radio>
                <Radio value="EUR">
                  EUR
                  <Radio.Description>Euro</Radio.Description>
                </Radio>
                <Radio value="GBP">
                  GBP
                  <Radio.Description>Pound Sterling</Radio.Description>
                </Radio>
              </Radio.Group>
            </div>
          )) ||
          (setting === "psts" && (
            <>
              {(removedPSTs().length > 0 &&
                removedPSTs().map((pst, i) => (
                  <div
                    className={styles.Setting + " " + styles.SubSetting}
                    key={i}
                  >
                    <h1>
                      {pst.name} ({pst.ticker})
                    </h1>
                    <div
                      className={styles.Arrow}
                      onClick={() =>
                        dispatch(readdAsset(currentAddress, pst.id))
                      }
                    >
                      <XIcon />
                    </div>
                  </div>
                ))) || <p>No removed PSTs</p>}
            </>
          )) ||
          (setting === "allowances" && (
            <>
              {allowances.map((allowance, i) => (
                <div
                  className={
                    styles.Setting +
                    " " +
                    styles.NoFlex +
                    " " +
                    styles.SubSetting
                  }
                  key={i}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <h1>{allowance.url}</h1>
                    <p>
                      <Toggle
                        checked={allowance.enabled}
                        onChange={() =>
                          dispatch(
                            toggleAllowance(allowance.url, !allowance.enabled)
                          )
                        }
                      />
                    </p>
                  </div>
                  <p style={{ marginBottom: ".2em", marginTop: ".25em" }}>
                    Spent: {arweave.ar.winstonToAr(allowance.spent.toString())}{" "}
                    AR
                  </p>
                  <p style={{ display: "flex", alignItems: "center" }}>
                    Limit:{" "}
                    {(editingAllowance && editingAllowance.id === i && (
                      <input
                        className={styles.ClearInput}
                        type="number"
                        value={editingAllowance.val}
                        autoFocus
                        onChange={(e) =>
                          setEditingAllowance({
                            id: i,
                            val: Number(e.target.value)
                          })
                        }
                      />
                    )) ||
                      allowance.limit}{" "}
                    AR
                    <span
                      className={styles.EditAllowance}
                      onClick={() => {
                        if (!editingAllowance)
                          setEditingAllowance({ id: i, val: allowance.limit });
                        else {
                          setEditingAllowance(undefined);
                          dispatch(
                            setAllowanceLimit(
                              allowance.url,
                              editingAllowance.val
                            )
                          );
                        }
                      }}
                    >
                      {(editingAllowance && editingAllowance.id === i && (
                        <CheckIcon />
                      )) || <PencilIcon />}
                    </span>
                  </p>
                </div>
              ))}
            </>
          )) ||
          (setting === "sites" && (
            <>
              {blockedURLs.length > 0 &&
                blockedURLs.map((url, i) => (
                  <div
                    className={styles.Setting + " " + styles.SubSetting}
                    key={i}
                  >
                    <h1>{url}</h1>
                    <div
                      className={styles.Arrow}
                      onClick={() => dispatch(unblockURL(url))}
                    >
                      <XIcon />
                    </div>
                  </div>
                ))}
              <div className={styles.OptionContent}>
                <Input
                  {...addURLInput.bindings}
                  placeholder="Enter url (site.com)..."
                />
                <Button
                  style={{ width: "100%", marginTop: ".5em" }}
                  onClick={blockInputUrl}
                >
                  Block url
                </Button>
              </div>
            </>
          )) ||
          (setting === "events" && (
            <>
              {events.length > 0 && (
                <div
                  className={styles.Setting + " " + styles.SubSetting}
                  onClick={() => {
                    localStorage.setItem(
                      "arweave_events",
                      JSON.stringify({ val: [] })
                    );
                    setEvents([]);
                  }}
                >
                  <h1>Clear events...</h1>
                </div>
              )}
              {(events.length > 0 &&
                events.map((event, i) => (
                  <div
                    className={
                      styles.Setting +
                      " " +
                      styles.SubSetting +
                      " " +
                      styles.EventItem
                    }
                    key={i}
                  >
                    <h1>
                      {event.event}
                      <span className={styles.EventDate}>
                        {new Intl.DateTimeFormat(navigator.language, {
                          timeStyle: "medium",
                          dateStyle: "short"
                        }).format(event.date)}
                      </span>
                    </h1>
                    <p>{getRealURL(event.url)}</p>
                  </div>
                ))) || <p>No events</p>}
            </>
          )) ||
          (setting === "arweave" && (
            <div className={styles.OptionContent}>
              <Spacer />
              <Input
                {...arweaveHostInput.bindings}
                placeholder="Host..."
                status={arweaveHostInput.state === "" ? "error" : "default"}
              />
              <Spacer />
              <Input
                {...arweavePortInput.bindings}
                placeholder="Port..."
                type="number"
                status={arweavePortInput.state === "" ? "error" : "default"}
              />
              <Spacer />
              <Input
                {...arweaveProtocolInput.bindings}
                placeholder="Protocol..."
                status={arweaveProtocolInput.state === "" ? "error" : "default"}
              />
              <Spacer />
              <Button
                style={{ width: "100%", marginTop: ".5em" }}
                onClick={updateConfig}
              >
                Set config
              </Button>
            </div>
          )) ||
          (setting === "arverify" && (
            <div className={styles.OptionContent}>
              <h1>Threshold:</h1>
              <Radio.Group
                value={otherSettings.arVerifyTreshold}
                onChange={(val) =>
                  dispatch(
                    updateSettings({ arVerifyTreshold: val as Threshold })
                  )
                }
                className={styles.Radio}
              >
                <Radio value={Threshold.LOW}>
                  Low
                  <Radio.Description>{Threshold.LOW * 100}%</Radio.Description>
                </Radio>
                <Radio value={Threshold.MEDIUM}>
                  Medium
                  <Radio.Description>
                    {Threshold.MEDIUM * 100}%
                  </Radio.Description>
                </Radio>
                <Radio value={Threshold.HIGH}>
                  High
                  <Radio.Description>{Threshold.HIGH * 100}%</Radio.Description>
                </Radio>
                <Radio value={Threshold.ULTRA}>
                  Ultra
                  <Radio.Description>
                    {Threshold.ULTRA * 100}%
                  </Radio.Description>
                </Radio>
              </Radio.Group>
            </div>
          ))}
      </div>
    </>
  );
}

export interface ArConnectEvent {
  event: MessageType;
  url: string;
  date: number;
}
