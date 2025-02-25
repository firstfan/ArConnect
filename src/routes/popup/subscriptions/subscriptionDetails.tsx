import {
  SubscriptionStatus,
  type SubscriptionData
} from "~subscriptions/subscription";
import HeadV2 from "~components/popup/HeadV2";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { getActiveAddress } from "~wallets";
import browser from "webextension-polyfill";
import styled from "styled-components";
import {
  deleteSubscription,
  getSubscriptionData,
  updateAllowance,
  updateAutoRenewal,
  updateSubscription
} from "~subscriptions";
import dayjs from "dayjs";
import {
  ButtonV2,
  type DisplayTheme,
  useToasts,
  TooltipV2,
  InputV2,
  useInput
} from "@arconnect/components";
import { AppIcon, Content, Title, getColorByStatus } from "./subscriptions";
import { CreditCardUpload } from "@untitled-ui/icons-react";
import {
  SettingIconWrapper,
  SettingImage
} from "~components/dashboard/list/BaseElement";
import { formatAddress } from "~utils/format";
import { useTheme } from "~utils/theme";
import { useHistory } from "~utils/hash_router";
import { getPrice } from "~lib/coingecko";
import useSetting from "~settings/hook";
import { PageType, trackPage } from "~utils/analytics";

interface Props {
  id?: string;
}

export default function SubscriptionDetails({ id }: Props) {
  const theme = useTheme();
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [checked, setChecked] = useState(false);
  const [autopayChecked, setAutopayChecked] = useState(false);

  const [push, goBack] = useHistory();
  const { setToast } = useToasts();
  const [price, setPrice] = useState<number | null>();
  const [currency] = useSetting<string>("currency");
  const [color, setColor] = useState<string>("");

  // network fee

  const cancel = async () => {
    const address = await getActiveAddress();
    if (subData.subscriptionStatus !== SubscriptionStatus.CANCELED) {
      try {
        await updateSubscription(
          address,
          subData.arweaveAccountAddress,
          SubscriptionStatus.CANCELED
        );
        setToast({
          type: "success",
          content: browser.i18n.getMessage("subscription_cancelled"),
          duration: 5000
        });
      } catch {
        setToast({
          type: "error",
          content: browser.i18n.getMessage("subscription_cancelled_error"),
          duration: 5000
        });
      }
    } else {
      try {
        await deleteSubscription(address, subData.arweaveAccountAddress);
        setToast({
          type: "success",
          content: browser.i18n.getMessage("subscription_deleted"),
          duration: 5000
        });
      } catch (err) {
        setToast({
          type: "error",
          content: browser.i18n.getMessage("subcription_delete_error"),
          duration: 5000
        });
      }
    }

    browser.alarms.clear(`subscription-alarm-${subData.arweaveAccountAddress}`);
    goBack();
    // redirect to subscription page
  };

  useEffect(() => {
    const update = async () => {
      try {
        const address = await getActiveAddress();
        if (subData) {
          if (!autopayChecked) {
            updateAllowance(0, address, subData.arweaveAccountAddress);
          } else {
            updateAllowance(
              subData.subscriptionFeeAmount,
              address,
              subData.arweaveAccountAddress
            );
          }
        }
      } catch (err) {
        console.log("err", err);
      }
    };
    update();
  }, [autopayChecked]);

  useEffect(() => {
    async function getSubData() {
      const address = await getActiveAddress();

      try {
        const data = await getSubscriptionData(address);
        // finding like this for now
        const subscription = data.find(
          (subscription) => subscription.arweaveAccountAddress === id
        );
        setSubData(subscription);
        setChecked(subscription.applicationAutoRenewal);
        setColor(getColorByStatus(subscription.subscriptionStatus));
        setAutopayChecked(!!subscription.applicationAllowance);
        const arPrice = await getPrice("arweave", currency);
        if (arPrice) {
          setPrice(arPrice * subscription.subscriptionFeeAmount);
        }
      } catch (error) {
        console.error("Error fetching subscription data:", error);
      }
    }

    // segment
    trackPage(PageType.SUBSCRIPTIONS_MANAGEMENT);

    getSubData();
  }, []);

  // update auto renewal
  useEffect(() => {
    const update = async () => {
      try {
        const address = await getActiveAddress();
        if (subData) {
          await updateAutoRenewal(
            checked,
            address,
            subData.arweaveAccountAddress
          );
        }
      } catch (err) {
        console.log("err", err);
      }
    };
    update();
  }, [checked]);

  return (
    <>
      <HeadV2 title={subData?.applicationName} />
      {subData && (
        <Wrapper>
          <Main>
            <SubscriptionListItem>
              <Content style={{ cursor: "default" }}>
                <SettingIconWrapper
                  bg={theme === "light" ? "235,235,235" : "255, 255, 255"}
                  customSize="2.625rem"
                >
                  {subData.applicationIcon && (
                    <SettingImage src={subData.applicationIcon} />
                  )}
                </SettingIconWrapper>
                <Title style={{ display: "flex", alignItems: "flex-end" }}>
                  <div>
                    <h2>{subData.applicationName}</h2>
                    <h3 style={{ fontSize: "12px", display: "flex" }}>
                      Status:{" "}
                      <span style={{ color }}>
                        {subData.subscriptionStatus}
                      </span>
                      {/* TODO: Needs Refactor */}
                      {subData.subscriptionStatus ===
                        SubscriptionStatus.AWAITING_PAYMENT && (
                        <PayNowButton
                          onClick={() =>
                            push(
                              `/subscriptions/${subData.arweaveAccountAddress}/payment`
                            )
                          }
                        >
                          Pay now <PaymentIcon />
                        </PayNowButton>
                      )}
                    </h3>
                  </div>
                </Title>
              </Content>
            </SubscriptionListItem>
            <SubscriptionText
              displayTheme={theme}
              color={theme === "light" ? "#191919" : "#ffffff"}
            >
              {browser.i18n.getMessage("subscription_application_address")}:{" "}
              <span>{formatAddress(subData.arweaveAccountAddress, 5)}</span>
            </SubscriptionText>
            <PaymentDetails>
              <h6>Recurring payment amount</h6>
              <Body>
                <h3>{subData.subscriptionFeeAmount} AR</h3>
                <SubscriptionText
                  fontSize="14px"
                  color={theme === "light" ? "#191919" : "#ffffff"}
                >
                  Subscription: {subData.recurringPaymentFrequency}
                </SubscriptionText>
              </Body>
              <Body>
                <SubscriptionText fontSize="14px">
                  ${price ? price.toFixed(2) : "--.--"} {currency}
                </SubscriptionText>
                <SubscriptionText
                  fontSize="14px"
                  color={theme === "light" ? "#191919" : "#ffffff"}
                >
                  Next payment:{" "}
                  {dayjs(subData.nextPaymentDue).format("MMM DD, YYYY")}
                </SubscriptionText>
              </Body>
            </PaymentDetails>
            <Divider />
            <div>
              <Body>
                <SubscriptionText
                  fontSize="14px"
                  color={theme === "light" ? "#191919" : "#ffffff"}
                >
                  Start
                </SubscriptionText>
                <SubscriptionText
                  fontSize="14px"
                  color={theme === "light" ? "#191919" : "#ffffff"}
                >
                  End
                </SubscriptionText>
              </Body>
              <Body>
                <SubscriptionText>
                  {dayjs(subData.subscriptionStartDate).format("MMM DD, YYYY")}
                </SubscriptionText>
                <SubscriptionText>
                  {dayjs(subData.subscriptionEndDate).format("MMM DD, YYYY")}
                </SubscriptionText>
              </Body>
            </div>
            {/* Toggle */}
            <Body>
              <SubscriptionText
                color={theme === "light" ? "#191919" : "#ffffff"}
              >
                Auto-renewal
              </SubscriptionText>
              <ToggleSwitch checked={checked} setChecked={setChecked} />
            </Body>
            {/* TODO: temporarily disabling threshold */}
            <Body>
              <SubscriptionText
                color={theme === "light" ? "#191919" : "#ffffff"}
              >
                Auto-Pay
                <TooltipV2 content={InfoText} position="bottom">
                  <InfoCircle />
                </TooltipV2>
              </SubscriptionText>
              <ToggleSwitch
                checked={autopayChecked}
                setChecked={setAutopayChecked}
              />
            </Body>
            {/* <Threshold>
              <Body>
                <SubscriptionText
                  color={theme === "light" ? "#191919" : "#ffffff"}
                >
                  Allowance{" "}
                  <TooltipV2 content={InfoText} position="bottom">
                    <InfoCircle />
                  </TooltipV2>
                </SubscriptionText>
              </Body>
              <InputV2 fullWidth {...allowanceInput.bindings} />{" "}
            </Threshold> */}
          </Main>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            <ButtonV2
              fullWidth
              style={{ fontWeight: "500" }}
              onClick={() => push(`/subscriptions/${id}/manage`)}
            >
              Manage Subscription
            </ButtonV2>
            <ButtonV2
              fullWidth
              style={{ fontWeight: "500", backgroundColor: "#8C1A1A" }}
              onClick={async () => await cancel()}
            >
              {subData.subscriptionStatus !== SubscriptionStatus.CANCELED
                ? "Cancel Subscription"
                : "Remove Subscription"}
            </ButtonV2>
          </div>
        </Wrapper>
      )}
    </>
  );
}

export const InfoText: React.ReactNode = (
  <div style={{ fontSize: "10px", lineHeight: "14px", textAlign: "center" }}>
    Enable if you'd like <br />
    ArConnect to <br />
    automatically transfer <br />
    to due payments
  </div>
);

export const SubscriptionText = styled.div<{
  displayTheme?: DisplayTheme;
  fontSize?: string;
  color?: string;
}>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${(props) => props.fontSize || "16px"};
  font-weight: 500;
  white-space: nowrap;
  color: ${(props) =>
    props.color
      ? props.color
      : props.displayTheme === "dark"
      ? "#a3a3a3"
      : "#757575"};

  span {
    color: ${(props) => props.color || "#ffffff"};
  }
`;

export const Threshold = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Divider = styled.div`
  width: 100%;
  border-top: 1px solid ${(props) => props.theme.backgroundSecondary};
`;

export const Body = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
`;

export const PaymentDetails = styled.div`
  h3 {
    margin: 0;
    font-size: 32px;
    font-weight: 600;
  }
  h6 {
    margin: 0;
    font-weight: 500;
    font-size: 10px;
  }
`;

export const PayNowButton = styled.div`
  display: flex;
  align-items: flex-end;
  line-height: 16px;
  font-size: 12px;
  color: ${(props) => props.theme.primary};
  margin-left: 12px;
  gap: 4px;
  cursor: pointer;
`;

export const PaymentIcon = styled(CreditCardUpload)`
  width: 16px;
  height: 16px;
  color: ${(props) => props.theme.primary};
`;

export const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  justify-content: space-between;
  padding: 15px;
`;

export const SubscriptionListItem = styled.div`
  display: flex;
`;

export const ToggleSwitch = ({
  checked,
  setChecked
}: {
  checked: boolean;
  setChecked: Dispatch<SetStateAction<boolean>>;
}) => {
  // const [checked, setChecked] = useState(false);

  const handleChange = () => {
    setChecked(!checked);
  };

  return (
    <SwitchWrapper>
      <Checkbox type="checkbox" checked={checked} onChange={handleChange} />
      <Slider />
    </SwitchWrapper>
  );
};

const SwitchWrapper = styled.label`
  position: relative;
  display: inline-block;
  width: 44px; // Total width of the switch
  height: 22px; // Total height of the switch
`;

const Slider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 22px;

  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }
`;

const Checkbox = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + ${Slider} {
    background-color: #8e7bea;
  }

  &:checked + ${Slider}:before {
    // The translateX value should match the width of the switch minus the circle diameter and margins
    transform: translateX(22px); // Adjusted to fit the new size
  }
`;

export const InfoCircle = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <g clip-path="url(#clip0_47_119)">
      <path
        d="M8.00004 10.6667V8M8.00004 5.33333H8.00671M14.6667 8C14.6667 11.6819 11.6819 14.6667 8.00004 14.6667C4.31814 14.6667 1.33337 11.6819 1.33337 8C1.33337 4.3181 4.31814 1.33333 8.00004 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z"
        stroke="#A3A3A3"
        stroke-width="1.33333"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_47_119">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);
