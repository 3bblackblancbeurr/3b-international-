#include "ThreeBWorldBridgeSubsystem.h"

#include "Dom/JsonObject.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

void UThreeBWorldBridgeSubsystem::ConfigureApiBase(const FString& InApiBase)
{
    ApiBase = InApiBase;
    ApiBase.RemoveFromEnd(TEXT("/"));
}

void UThreeBWorldBridgeSubsystem::Fail(const FString& Message)
{
    SessionToken.Reset();
    UserId.Reset();
    PassportId.Reset();
    Country.Reset();
    BootstrapWorldJson.Reset();
    WorldRevision = 0;
    OnBridgeError.Broadcast(Message);
}

void UThreeBWorldBridgeSubsystem::RedeemLaunchTicket(const FString& Ticket, const FString& DeviceId)
{
    if (ApiBase.IsEmpty() || Ticket.Len() < 40)
    {
        Fail(TEXT("Le portail 3B n'a pas reçu de ticket valide."));
        return;
    }

    TSharedRef<FJsonObject> Payload = MakeShared<FJsonObject>();
    Payload->SetStringField(TEXT("ticket"), Ticket);
    Payload->SetStringField(TEXT("device"), DeviceId.Left(128));
    Payload->SetStringField(TEXT("client"), TEXT("unreal-5.8"));

    FString Body;
    const TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Body);
    FJsonSerializer::Serialize(Payload, Writer);

    const TSharedRef<IHttpRequest> Request = FHttpModule::Get().CreateRequest();
    Request->SetURL(ApiBase + TEXT("/functions/v1/world-unreal-redeem"));
    Request->SetVerb(TEXT("POST"));
    Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
    Request->SetHeader(TEXT("X-3B-Client"), TEXT("unreal-5.8"));
    Request->SetContentAsString(Body);
    Request->SetTimeout(12.0f);

    Request->OnProcessRequestComplete().BindWeakLambda(this,
        [this](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnectedSuccessfully)
        {
            if (!bConnectedSuccessfully || !Response.IsValid())
            {
                Fail(TEXT("Connexion au Monde du 3B indisponible."));
                return;
            }

            TSharedPtr<FJsonObject> Json;
            const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Response->GetContentAsString());
            if (!FJsonSerializer::Deserialize(Reader, Json) || !Json.IsValid())
            {
                Fail(TEXT("Réponse du portail 3B invalide."));
                return;
            }

            if (Response->GetResponseCode() < 200 || Response->GetResponseCode() >= 300)
            {
                FString Error;
                Json->TryGetStringField(TEXT("error"), Error);
                Fail(Error.IsEmpty() ? TEXT("Le ticket 3B a été refusé.") : Error);
                return;
            }

            FString NewSessionToken;
            FString NewUserId;
            FString PassportId;
            FString Country;
            double Revision = 0;

            Json->TryGetStringField(TEXT("session_token"), NewSessionToken);
            Json->TryGetStringField(TEXT("user_id"), NewUserId);
            Json->TryGetStringField(TEXT("passport_id"), PassportId);
            Json->TryGetStringField(TEXT("country"), Country);
            Json->TryGetNumberField(TEXT("world_revision"), Revision);

            if (NewSessionToken.Len() < 40 || NewUserId.IsEmpty())
            {
                Fail(TEXT("Session Monde 3B incomplète."));
                return;
            }

            FString WorldJson;
            if (const TSharedPtr<FJsonValue>* WorldValue = Json->Values.Find(TEXT("world_state"));
                WorldValue && WorldValue->IsValid() && (*WorldValue)->Type == EJson::Object)
            {
                if (const TSharedPtr<FJsonObject> WorldObject = (*WorldValue)->AsObject(); WorldObject.IsValid())
                {
                    const TSharedRef<TJsonWriter<>> WorldWriter = TJsonWriterFactory<>::Create(&WorldJson);
                    FJsonSerializer::Serialize(WorldObject.ToSharedRef(), WorldWriter);
                }
            }

            SessionToken = MoveTemp(NewSessionToken);
            UserId = MoveTemp(NewUserId);
            this->PassportId = MoveTemp(PassportId);
            this->Country = MoveTemp(Country);
            BootstrapWorldJson = MoveTemp(WorldJson);
            WorldRevision = FMath::Max(0, FMath::RoundToInt(Revision));
            OnBridgeReady.Broadcast(UserId, this->PassportId, this->Country, WorldRevision);
        });

    if (!Request->ProcessRequest())
    {
        Fail(TEXT("Impossible d'ouvrir le portail 3B."));
    }
}
