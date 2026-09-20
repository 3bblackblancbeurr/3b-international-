#include "ThreeBBackendSubsystem.h"
#include "ThreeBBackendContract.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"

void UThreeBBackendSubsystem::ConfigurePublicBackend(const FString& InBaseUrl, const FString& InPublishableKey)
{
    BaseUrl = InBaseUrl;
    BaseUrl.RemoveFromEnd(TEXT("/"));
    PublishableKey = InPublishableKey;
}

void UThreeBBackendSubsystem::SetUserAccessToken(const FString& InAccessToken)
{
    AccessToken = InAccessToken;
}

bool UThreeBBackendSubsystem::HasAuthenticatedSession() const
{
    return !BaseUrl.IsEmpty() && !PublishableKey.IsEmpty() && !AccessToken.IsEmpty();
}

void UThreeBBackendSubsystem::SendWorldCommands(const FString& DeviceId, const FString& CommandsJson)
{
    if (!HasAuthenticatedSession())
    {
        OnWorldResponse.Broadcast(false, 0, TEXT("{\"error\":\"missing_session\"}"));
        return;
    }

    const FString Body = FString::Printf(
        TEXT("{\"device\":\"%s\",\"commands\":%s}"),
        *DeviceId,
        *CommandsJson
    );

    SendJsonPost(ThreeBBackend::WorldEnginePath, Body, EThreeBBackendChannel::World);
}

void UThreeBBackendSubsystem::RequestCitySnapshot()
{
    if (!HasAuthenticatedSession())
    {
        OnCityResponse.Broadcast(false, 0, TEXT("{\"error\":\"missing_session\"}"));
        return;
    }

    SendJsonPost(ThreeBBackend::City3BPath, TEXT("{\"action\":\"snapshot\"}"), EThreeBBackendChannel::City);
}

void UThreeBBackendSubsystem::RequestWorldBootstrap()
{
    if (!HasAuthenticatedSession())
    {
        OnBootstrapResponse.Broadcast(false, 0, TEXT("{\"error\":\"missing_session\"}"));
        return;
    }

    SendJsonPost(ThreeBBackend::WorldBootstrapPath, TEXT("{}"), EThreeBBackendChannel::Bootstrap);
}

void UThreeBBackendSubsystem::SendJsonPost(const FString& Path, const FString& Body, EThreeBBackendChannel Channel)
{
    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
    Request->SetURL(BaseUrl + Path);
    Request->SetVerb(TEXT("POST"));
    Request->SetHeader(ThreeBBackend::HeaderContentType, ThreeBBackend::JsonContentType);
    Request->SetHeader(ThreeBBackend::HeaderApiKey, PublishableKey);
    Request->SetHeader(ThreeBBackend::HeaderAuthorization, TEXT("Bearer ") + AccessToken);
    Request->SetContentAsString(Body);

    const TWeakObjectPtr<UThreeBBackendSubsystem> WeakThis(this);
    Request->OnProcessRequestComplete().BindLambda(
        [WeakThis, Channel](FHttpRequestPtr, FHttpResponsePtr Response, bool Connected)
        {
            if (!WeakThis.IsValid())
            {
                return;
            }

            const int32 Status = Response.IsValid() ? Response->GetResponseCode() : 0;
            const FString Json = Response.IsValid() ? Response->GetContentAsString() : TEXT("{}");
            const bool Success = Connected && Status >= 200 && Status < 300;

            switch (Channel)
            {
                case EThreeBBackendChannel::World:
                    WeakThis->OnWorldResponse.Broadcast(Success, Status, Json);
                    break;
                case EThreeBBackendChannel::City:
                    WeakThis->OnCityResponse.Broadcast(Success, Status, Json);
                    break;
                case EThreeBBackendChannel::Bootstrap:
                    WeakThis->OnBootstrapResponse.Broadcast(Success, Status, Json);
                    break;
            }
        }
    );

    Request->ProcessRequest();
}
