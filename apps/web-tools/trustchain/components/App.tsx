import React, { useCallback, useEffect, useState } from "react";
import {
  createQRCodeHostInstance,
  createQRCodeCandidateInstance,
} from "@ledgerhq/trustchain/qrcode/index";
import { InvalidDigitsError } from "@ledgerhq/trustchain/errors";
import { setEnv, getEnvDefault } from "@ledgerhq/live-env";
import { withDevice } from "@ledgerhq/live-common/hw/deviceAccess";
import { from, lastValueFrom } from "rxjs";
import styled from "styled-components";
import { JWT, LiveCredentials, Trustchain, TrustchainMember } from "@ledgerhq/trustchain/types";
import { Actionable, RenderActionable } from "./Actionable";
import Transport from "@ledgerhq/hw-transport";
import QRCode from "./QRCode";
import useEnv from "../useEnv";
import Expand from "./Expand";
import useSDK from "../useSDK";

const Container = styled.div`
  padding: 20px;
  margin: 0 auto;
  max-width: 800px;
  display: flex;
  flex-direction: column;
`;

const Input = styled.input`
  padding: 0.8em;
  width: 100%;
`;

const App = () => {
  const [seedIdAccessToken, setSeedIdAccessToken] = useState<JWT | null>(null);
  const [liveCredentials, setLiveCredentials] = useState<LiveCredentials | null>(null);
  const [trustchain, setTrustchain] = useState<Trustchain | null>(null);
  const [liveAccessToken, setLiveAccessToken] = useState<JWT | null>(null);
  const [members, setMembers] = useState<TrustchainMember[] | null>(null);

  return (
    <Container>
      <h2>Wallet Sync Trustchain Playground</h2>

      <Expand title="Environment">
        <AppSetTrustchainAPIEnv />
        <AppMockEnv />
      </Expand>

      <h3>Trustchain SDK</h3>

      <AppInitLiveCredentials
        liveCredentials={liveCredentials}
        setLiveCredentials={setLiveCredentials}
      />

      <AppSeedIdAuthenticate
        seedIdAccessToken={seedIdAccessToken}
        setSeedIdAccessToken={setSeedIdAccessToken}
      />

      <AppGetOrCreateTrustchain
        seedIdAccessToken={seedIdAccessToken}
        liveCredentials={liveCredentials}
        trustchain={trustchain}
        setTrustchain={setTrustchain}
      />

      <AppLiveAuthenticate
        liveAccessToken={liveAccessToken}
        setLiveAccessToken={setLiveAccessToken}
        liveCredentials={liveCredentials}
        trustchain={trustchain}
      />

      <AppGetMembers
        liveAccessToken={liveAccessToken}
        liveCredentials={liveCredentials}
        trustchain={trustchain}
        members={members}
        setMembers={setMembers}
      />

      {members?.map(member => (
        <AppMemberRow
          key={member.id}
          seedIdAccessToken={seedIdAccessToken}
          trustchain={trustchain}
          liveInstanceCredentials={liveCredentials}
          member={member}
          setTrustchain={setTrustchain}
        />
      ))}

      {/* // in future, to facilitate the test, we can do this. for now we can play with the qr code flow.
      {members ? (
        <AppMemberAddForm
          liveAccessToken={liveAccessToken}
          trustchain={trustchain}
          liveCredentials={liveCredentials}
        />
      ) : null}
    */}

      <AppDestroyTrustchain trustchain={trustchain} liveAccessToken={liveAccessToken} />

      <Expand title="QR Code Host">
        <AppQRCodeHost trustchain={trustchain} liveCredentials={liveCredentials} />
      </Expand>

      <Expand title="QR Code Candidate">
        <AppQRCodeCandidate liveCredentials={liveCredentials} />
      </Expand>
    </Container>
  );
};

function runWithDevice<T>(fn: (transport: Transport) => Promise<T>): Promise<T> {
  return lastValueFrom(withDevice("webhid")(transport => from(fn(transport))));
}

function AppSetTrustchainAPIEnv() {
  const env = useEnv("TRUSTCHAIN_API");
  const [localValue, setLocalValue] = useState(env);
  const action = useCallback(() => Promise.resolve(localValue), [localValue]);
  return (
    <Actionable
      buttonTitle="Set Trustchain API"
      inputs={[]}
      action={action}
      value={env}
      setValue={v => setEnv("TRUSTCHAIN_API", v || getEnvDefault("TRUSTCHAIN_API"))}
      valueDisplay={() => (
        <Input type="text" value={localValue} onChange={e => setLocalValue(e.target.value)} />
      )}
    />
  );
}

function AppMockEnv() {
  const mockEnv = useEnv("MOCK");
  const action = useCallback(
    (mockEnv: string) => (mockEnv ? "" : Math.random().toString().slice(2)),
    [],
  );
  return (
    <Actionable
      buttonTitle="Toggle Mock Env"
      inputs={[mockEnv]}
      action={action}
      value={mockEnv}
      setValue={v => setEnv("MOCK", v || "")}
      valueDisplay={v => "MOCK ENV: " + (v || "(unset)")}
    />
  );
}

function AppInitLiveCredentials({
  liveCredentials,
  setLiveCredentials,
}: {
  liveCredentials: LiveCredentials | null;
  setLiveCredentials: (liveCredentials: LiveCredentials | null) => void;
}) {
  const sdk = useSDK();
  const action = useCallback(() => sdk.initLiveCredentials(), [sdk]);

  const valueDisplay = useCallback(
    (liveCredentials: LiveCredentials) => "pubkey: " + liveCredentials.pubkey,
    [],
  );

  return (
    <Actionable
      buttonTitle="sdk.initLiveCredentials"
      inputs={[]}
      action={action}
      setValue={setLiveCredentials}
      value={liveCredentials}
      valueDisplay={valueDisplay}
    />
  );
}

function AppSeedIdAuthenticate({
  seedIdAccessToken,
  setSeedIdAccessToken,
}: {
  seedIdAccessToken: { accessToken: string } | null;
  setSeedIdAccessToken: (seedIdAccessToken: { accessToken: string } | null) => void;
}) {
  const sdk = useSDK();

  const action = useCallback(
    () => runWithDevice(transport => sdk.seedIdAuthenticate(transport)),
    [sdk],
  );

  const valueDisplay = useCallback(
    (seedIdAccessToken: { accessToken: string }) => "JWT: " + seedIdAccessToken.accessToken,
    [],
  );

  return (
    <Actionable
      buttonTitle="sdk.seedIdAuthenticate"
      inputs={[]}
      action={action}
      valueDisplay={valueDisplay}
      value={seedIdAccessToken}
      setValue={setSeedIdAccessToken}
    />
  );
}

function AppGetOrCreateTrustchain({
  seedIdAccessToken,
  liveCredentials,
  trustchain,
  setTrustchain,
}: {
  seedIdAccessToken: JWT | null;
  liveCredentials: LiveCredentials | null;
  trustchain: Trustchain | null;
  setTrustchain: (trustchain: Trustchain | null) => void;
}) {
  const sdk = useSDK();

  const action = useCallback(
    (seedIdAccessToken: JWT, liveCredentials: LiveCredentials) =>
      runWithDevice(transport =>
        sdk.getOrCreateTrustchain(transport, seedIdAccessToken, liveCredentials),
      ),
    [sdk],
  );

  const valueDisplay = useCallback((trustchain: Trustchain) => trustchain.rootId, []);

  return (
    <Actionable
      buttonTitle="sdk.getOrCreateTrustchain"
      inputs={seedIdAccessToken && liveCredentials ? [seedIdAccessToken, liveCredentials] : null}
      action={action}
      valueDisplay={valueDisplay}
      value={trustchain}
      setValue={setTrustchain}
    />
  );
}

function AppLiveAuthenticate({
  liveAccessToken,
  setLiveAccessToken,
  liveCredentials,
  trustchain,
}: {
  liveAccessToken: JWT | null;
  setLiveAccessToken: (liveAccessToken: JWT | null) => void;
  liveCredentials: LiveCredentials | null;
  trustchain: Trustchain | null;
}) {
  const sdk = useSDK();

  const action = useCallback(
    (trustchain: Trustchain, liveCredentials: LiveCredentials) =>
      sdk.liveAuthenticate(trustchain, liveCredentials),
    [sdk],
  );

  const valueDisplay = useCallback((liveAccessToken: JWT) => liveAccessToken.accessToken, []);

  return (
    <Actionable
      buttonTitle="sdk.liveAuthenticate"
      inputs={trustchain && liveCredentials ? [trustchain, liveCredentials] : null}
      action={action}
      valueDisplay={valueDisplay}
      value={liveAccessToken}
      setValue={setLiveAccessToken}
    />
  );
}

function AppGetMembers({
  liveAccessToken,
  liveCredentials,
  trustchain,
  members,
  setMembers,
}: {
  liveAccessToken: JWT | null;
  liveCredentials: LiveCredentials | null;
  trustchain: Trustchain | null;
  members: TrustchainMember[] | null;
  setMembers: (members: TrustchainMember[] | null) => void;
}) {
  const sdk = useSDK();

  const action = useCallback(
    (liveAccessToken: JWT, trustchain: Trustchain, liveCredentials: LiveCredentials) =>
      sdk.getMembers(liveAccessToken, trustchain, liveCredentials),
    [sdk],
  );

  const valueDisplay = useCallback(
    (members: TrustchainMember[]) => members.length + " members",
    [],
  );

  return (
    <Actionable
      buttonTitle="sdk.getMembers"
      inputs={
        liveAccessToken && trustchain && liveCredentials
          ? [liveAccessToken, trustchain, liveCredentials]
          : null
      }
      action={action}
      valueDisplay={valueDisplay}
      value={members}
      setValue={setMembers}
    />
  );
}

function AppMemberRow({
  seedIdAccessToken,
  trustchain,
  liveInstanceCredentials,
  member,
  setTrustchain,
}: {
  seedIdAccessToken: JWT | null;
  trustchain: Trustchain | null;
  liveInstanceCredentials: LiveCredentials | null;
  member: TrustchainMember;
  setTrustchain: (trustchain: Trustchain | null) => void;
}) {
  const sdk = useSDK();

  const action = useCallback(
    (seedIdAccessToken: JWT, trustchain: Trustchain, liveInstanceCredentials: LiveCredentials) =>
      runWithDevice(transport =>
        sdk.removeMember(transport, seedIdAccessToken, trustchain, liveInstanceCredentials, member),
      ).then(trustchain => {
        setTrustchain(trustchain);
        return member;
      }),
    [sdk, member, setTrustchain],
  );

  return (
    <Actionable
      buttonTitle="sdk.removeMember"
      inputs={
        seedIdAccessToken && trustchain && liveInstanceCredentials
          ? [seedIdAccessToken, trustchain, liveInstanceCredentials]
          : null
      }
      action={action}
      value={member}
      valueDisplay={member => (
        <>
          <code>{member.id}</code> <strong>{member.name}</strong>
        </>
      )}
    />
  );
}

function AppDestroyTrustchain({
  trustchain,
  liveAccessToken,
}: {
  trustchain: Trustchain | null;
  liveAccessToken: JWT | null;
}) {
  const sdk = useSDK();
  const action = useCallback(
    (trustchain: Trustchain, liveAccessToken: JWT) =>
      sdk.destroyTrustchain(trustchain, liveAccessToken),
    [sdk],
  );

  return (
    <Actionable
      buttonTitle="sdk.destroyTrustchain"
      inputs={trustchain && liveAccessToken ? [trustchain, liveAccessToken] : null}
      action={action}
    />
  );
}

function AppQRCodeHost({
  trustchain,
  liveCredentials,
}: {
  trustchain: Trustchain | null;
  liveCredentials: LiveCredentials | null;
}) {
  const sdk = useSDK();
  const [error, setError] = useState<Error | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [digits, setDigits] = useState<string | null>(null);
  const onStart = useCallback(() => {
    if (!trustchain || !liveCredentials) return;
    setError(null);
    createQRCodeHostInstance({
      onDisplayQRCode: url => {
        setUrl(url);
      },
      onDisplayDigits: digits => {
        setDigits(digits);
      },
      addMember: async member => {
        const jwt = await sdk.liveAuthenticate(trustchain, liveCredentials);
        await sdk.addMember(jwt, trustchain, liveCredentials, member);
      },
    })
      .catch(e => {
        if (e instanceof InvalidDigitsError) {
          return;
        }
        setError(e);
      })
      .then(() => {
        setUrl(null);
        setDigits(null);
      });
  }, [trustchain, liveCredentials, sdk]);
  return (
    <div>
      {" "}
      <RenderActionable
        enabled={!!trustchain && !!liveCredentials}
        error={error}
        loading={!!url}
        onClick={onStart}
        display={url}
        buttonTitle="Create QR Code Host"
      />
      <div>
        {digits ? (
          <strong>
            Digits: <code>{digits}</code>
          </strong>
        ) : url ? (
          <QRCode data={url} />
        ) : null}
      </div>
    </div>
  );
}

function AppQRCodeCandidate({ liveCredentials }: { liveCredentials: LiveCredentials | null }) {
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [input, setInput] = useState<string | null>(null);
  const [digits, setDigits] = useState<number | null>(null);
  const [inputCallback, setInputCallback] = useState<((input: string) => void) | null>(null);

  const onRequestQRCodeInput = useCallback(
    (config: { digits: number }, callback: (input: string) => void) => {
      setDigits(config.digits);
      setInputCallback(() => callback);
    },
    [],
  );

  const handleStart = useCallback(
    (scannedUrl: string, liveCredentials: LiveCredentials) => {
      return createQRCodeCandidateInstance({
        liveCredentials,
        scannedUrl,
        memberName: "web-tools-" + liveCredentials.pubkey.slice(-5),
        onRequestQRCodeInput,
      })
        .then(() => true)
        .catch(e => {
          // there can be various errors, InvalidDigitsError is one of them that can be handled
          if (e instanceof InvalidDigitsError) {
            alert("Invalid digits");
            return;
          }
          throw e;
        })
        .finally(() => {
          // at this stage, everything is done, we can reset the state
          setScannedUrl(null);
          setInput(null);
          setDigits(null);
          setInputCallback(null);
        });
    },
    [onRequestQRCodeInput],
  );

  const handleSendDigits = useCallback(
    (inputCallback: (_: string) => void, input: string) => (inputCallback(input), true),
    [],
  );

  return (
    <div>
      <Actionable
        buttonTitle="Set QR Code Host URL"
        inputs={scannedUrl && liveCredentials ? [scannedUrl, liveCredentials] : null}
        action={handleStart}
        value
        valueDisplay={() => (
          <Input
            type="text"
            value={scannedUrl || ""}
            onChange={e => setScannedUrl(e.target.value)}
          />
        )}
      />

      {digits ? (
        <Actionable
          buttonTitle="Send Digits"
          inputs={inputCallback && input && digits === input.length ? [inputCallback, input] : null}
          action={handleSendDigits}
          value
          valueDisplay={() => (
            <Input
              type="text"
              maxLength={digits}
              value={input || ""}
              onChange={e => setInput(e.target.value)}
            />
          )}
        />
      ) : null}
    </div>
  );
}

export default App;
