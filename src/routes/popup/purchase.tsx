import {
  InputV2,
  useInput,
  Text,
  ListItem,
  ButtonV2,
  Loading
} from "@arconnect/components";
import browser from "webextension-polyfill";
import { ChevronRight } from "@untitled-ui/icons-react";
import switchIcon from "url:/assets/ecosystem/switch-vertical.svg";
import styled from "styled-components";
import HeadV2 from "~components/popup/HeadV2";
import { AnimatePresence, type Variants } from "framer-motion";
import { SliderWrapper } from "./send";
import { useEffect, useMemo, useState } from "react";
import { PageType, trackPage } from "~utils/analytics";
import type { PaymentType, Quote } from "~lib/onramper";
import { useHistory } from "~utils/hash_router";
import { ExtensionStorage } from "~utils/storage";
import { useDebounce } from "~wallets/hooks";

export default function Purchase() {
  const [push] = useHistory();
  const youPayInput = useInput();
  const debouncedYouPayInput = useDebounce(youPayInput.state, 300);
  const [arConversion, setArConversion] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<any | null>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentType | null>();
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [quote, setQuote] = useState<Quote | null>();

  const handlePaymentClose = () => {
    setShowPaymentSelector(false);
  };

  const handleCurrencyClose = () => {
    setShowCurrencySelector(false);
  };

  //segment
  useEffect(() => {
    trackPage(PageType.TRANSAK_PURCHASE);
  }, []);

  useEffect(() => {
    const fetchCurrencies = async () => {
      const url =
        "https://api-stg.transak.com/api/v2/currencies/fiat-currencies?apiKey=a2bae4d6-8e3d-4777-b123-3ff31f653aa0";
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const currencyInfo = data.response.map((currency) => ({
          symbol: currency.symbol,
          logo: `https://cdn.onramper.com/icons/tokens/${currency.symbol.toLowerCase()}.svg`,
          name: currency.name,
          paymentOptions: currency.paymentOptions
        }));
        setCurrencies(currencyInfo || []);
        setSelectedCurrency(currencyInfo[0]);
        setPaymentMethod(currencyInfo[0].paymentOptions[0]);
      } catch (error) {
        console.error("Failed to fetch currencies:", error);
      }
    };

    fetchCurrencies();
  }, []);

  useEffect(() => {
    const fetchQuote = async () => {
      setLoading(true);
      setQuote(null);
      if (
        Number(debouncedYouPayInput) <= 0 ||
        debouncedYouPayInput === "" ||
        !selectedCurrency ||
        !paymentMethod
      ) {
        setLoading(false);
        setQuote(null);
        return;
      }
      const baseUrl = "https://api.transak.com/api/v1/pricing/public/quotes";
      const params = new URLSearchParams({
        partnerApiKey: process.env.PLASMO_PUBLIC_TRANSAK_API_KEY,
        fiatCurrency: selectedCurrency?.symbol,
        cryptoCurrency: "AR",
        isBuyOrSell: "BUY",
        network: "mainnet",
        paymentMethod: paymentMethod.id
      });
      if (arConversion) {
        params.append("cryptoAmount", debouncedYouPayInput);
      } else {
        params.append("fiatAmount", debouncedYouPayInput);
      }

      const url = `${baseUrl}?${params.toString()}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          setQuote(null);
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setQuote(data.response);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setQuote(null);
        setLoading(false);
      }
      setLoading(false);
    };

    if (debouncedYouPayInput) {
      fetchQuote();
    } else {
      setQuote(null);
    }
  }, [debouncedYouPayInput, selectedCurrency, paymentMethod, arConversion]);

  return (
    <>
      <HeadV2 title="Buy AR" />
      <Wrapper>
        <Top>
          {/* TODO Only allow numbers */}
          <InputV2
            small
            placeholder="0"
            {...youPayInput.bindings}
            label={
              !arConversion
                ? browser.i18n.getMessage("buy_screen_pay")
                : browser.i18n.getMessage("buy_screen_receive")
            }
            fullWidth
            icon={
              arConversion ? (
                <AR />
              ) : (
                <Tag
                  onClick={() => setShowCurrencySelector(true)}
                  currency={selectedCurrency?.symbol || ""}
                />
              )
            }
          />
          <Switch
            onClick={() => {
              setArConversion(!arConversion);
            }}
          >
            <img src={switchIcon} />
            <SwitchText noMargin>
              {browser.i18n.getMessage("buy_screen_switch")}
            </SwitchText>
          </Switch>
          <InputButton
            disabled={!arConversion}
            label={
              arConversion
                ? browser.i18n.getMessage("buy_screen_pay")
                : browser.i18n.getMessage("buy_screen_receive")
            }
            // label={arConversion ? "You Pay" : "You Receive"}
            onClick={() => setShowCurrencySelector(true)}
            body={
              loading ? (
                <Loading />
              ) : arConversion ? (
                quote?.fiatAmount.toString() ?? "--"
              ) : (
                quote?.cryptoAmount.toString() ?? "--"
              )
            }
            icon={
              !arConversion ? (
                <AR />
              ) : (
                <Tag
                  currency={selectedCurrency?.symbol || ""}
                  onClick={() => setShowCurrencySelector(true)}
                />
              )
            }
          />
          <Line />
          <InputButton
            label={browser.i18n.getMessage("buy_screen_payment_method")}
            onClick={() => setShowPaymentSelector(true)}
            disabled={false}
            body={paymentMethod?.name || ""}
            icon={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <ChevronRight onClick={() => setShowPaymentSelector(true)} />
              </div>
            }
          />
          <AnimatePresence>
            {showCurrencySelector && (
              <SliderWrapper
                variants={animation}
                initial="hidden"
                animate="shown"
                exit="hidden"
              >
                <CurrencySelectorScreen
                  onClose={handleCurrencyClose}
                  updateCurrency={setSelectedCurrency}
                  currencies={currencies}
                />
              </SliderWrapper>
            )}
            {showPaymentSelector && (
              <SliderWrapper
                variants={animation}
                initial="hidden"
                animate="shown"
                exit="hidden"
              >
                <PaymentSelectorScreen
                  payments={selectedCurrency.paymentOptions}
                  updatePayment={setPaymentMethod}
                  onClose={handlePaymentClose}
                />
              </SliderWrapper>
            )}
          </AnimatePresence>
        </Top>
        <ButtonV2
          disabled={!quote}
          fullWidth
          onClick={async () => {
            await ExtensionStorage.set("transak_quote", quote);
            push(`/confirm-purchase/${quote.quoteId}`);
          }}
        >
          Next
        </ButtonV2>
      </Wrapper>
    </>
  );
}

const AR = () => {
  return <div style={{ cursor: "default" }}>{"AR"}</div>;
};

const Tag = ({
  currency,
  onClick
}: {
  currency: string;
  onClick: () => void;
}) => {
  return (
    <div style={{ display: "flex" }} onClick={onClick}>
      {currency} <ChevronRight />
    </div>
  );
};

const PaymentSelectorScreen = ({
  onClose,
  updatePayment,
  payments
}: {
  onClose: () => void;
  updatePayment: (payment: any) => void;
  payments: any[];
}) => {
  const searchInput = useInput();

  return (
    <SelectorWrapper>
      <HeadV2
        back={onClose}
        title={"Choose a payment method"}
        padding={"0 0 15px 0;"}
      />
      {payments.map((payment, index) => {
        return (
          <ListItem
            key={index}
            small
            title={payment.name}
            description={`processing time ${payment.processingTime}`}
            img={payment.icon}
            onClick={() => {
              updatePayment(payment);
              onClose();
            }}
          />
        );
      })}
    </SelectorWrapper>
  );
};

const CurrencySelectorScreen = ({
  onClose,
  updateCurrency,
  currencies
}: {
  onClose: () => void;
  currencies: any[];
  updateCurrency: (currency: any) => void;
}) => {
  const searchInput = useInput();

  const filteredCurrencies = useMemo(() => {
    if (!searchInput.state) {
      return currencies;
    }
    return currencies.filter((currency) => {
      const name = currency.name?.toLowerCase() || "";
      const symbol = currency.symbol?.toLowerCase() || "";
      const searchLower = searchInput.state.toLowerCase();
      return name.includes(searchLower) || symbol.includes(searchLower);
    });
  }, [currencies, searchInput.state]);

  return (
    <SelectorWrapper>
      <HeadV2
        back={onClose}
        title={"Select Fiat Currency"}
        padding={"0 0 15px 0;"}
      />
      <div style={{ paddingBottom: "18px" }}>
        <InputV2
          placeholder="Enter currency name"
          fullWidth
          search
          small
          {...searchInput.bindings}
        />
      </div>
      {filteredCurrencies.map((currency, index) => {
        return (
          <ListItem
            key={index}
            small
            title={currency.symbol}
            description={currency.name}
            img={currency.logo}
            onClick={() => {
              updateCurrency(currency);
              onClose();
            }}
          />
        );
      })}
    </SelectorWrapper>
  );
};

const InputButton = ({
  label,
  body,
  icon,
  onClick,
  disabled
}: {
  label: string;
  body: string | React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) => {
  return (
    <div>
      <Label>{label}</Label>
      <InputButtonWrapper onClick={onClick} disabled={disabled}>
        <div>{body}</div>
        {icon}
      </InputButtonWrapper>
    </div>
  );
};

const InputButtonWrapper = styled.button`
  background: none;
  color: ${(props) => props.theme.primaryTextv2};
  font-size: 16px;
  display: flex;
  height: 42px;
  padding: 8.5px 15px;
  border-radius: 10px;
  width: 100%;
  justify-content: space-between;
  border: 1.5px solid ${(props) => props.theme.inputField};
  cursor: ${(props) => (props.disabled ? "default" : "pointer")};

  &:hover {
    border-color: ${(props) => !props.disabled && props.theme.primaryTextv2};
  }
`;

const Label = styled.div`
  padding-bottom: 8px;
  font-size: 16px;
  color: ${(props) => props.theme.primaryTextv2};
`;

const Wrapper = styled.div`
  padding: 15px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 96px);
  justify-content: space-between;
`;

const Top = styled.div``;

const SelectorWrapper = styled.div`
  max-width: 377.5px;
  padding: 15px;
  margin-left: auto;
  margin-right: auto;
`;

const Switch = styled.button`
  padding: 16px 0;
  display: flex;
  gap: 10px;
  border: none;
  background: none;
  outline: none;
  box-shadow: none;
  cursor: pointer;
`;
export const Line = styled.div<{ margin?: string }>`
  margin: ${(props) => (props.margin ? props.margin : "18px")} 0;
  height: 1px;
  width: 100%;
  background-color: ${(props) => props.theme.primary};
`;

const SwitchText = styled(Text)`
  color: ${(props) => props.theme.primaryTextv2};
`;

const animation: Variants = {
  hidden: { x: "-100%", opacity: 0 },
  shown: { x: "0%", opacity: 1 }
};
