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
        *DeviceId.ReplaceCharWithEscapedChar(),
        *CommandsJson
    );

    SendJsonPost(ThreeBBackend::WorldEnginePath, Body, &OnWorldResponse);
}

void UThreeBBackendSubsystem::RequestCitySnapshot()
{
    if (!HasAuthenticatedSession())
    {
        OnCityResponse.Broadcast(false, 0, TEXT("{\"error\":\"missing_session\"}"));
        return;
    }

    SendJsonPost(ThreeBBackend::City3BPath, TEXT("{\"action\":\"snapshot\"}"), &OnCityResponse);
}

void UThreeBBackendSubsystem::SendJsonPost(const FString& Path, const FString& Body, FThreeBBackendResponse* Event)
{
    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
    Request->SetURL(BaseUrl + Path);
    Request->SetVerb(TEXT("POST"));
    Request->SetHeader(ThreeBBackend::HeaderContentType, ThreeBBackend::JsonContentType);
    Request->SetHeader(ThreeBBackend::HeaderApiKey, PublishableKey);
    Request->SetHeader(ThreeBBackend::HeaderAuthorization, TEXT("Bearer ") + AccessToken);
    Request->SetContentAsString(Body);

    Request->OnProcessRequestComplete().BindLambda(
        [Event](FHttpRequestPtr, FHttpResponsePtr Response, bool Connected)
        {
            const int32 Status = Response.IsValid() ? Response->GetResponseCode() : 0;
            const FString Json = Response.IsValid() ? Response->GetContentAsString() : TEXT("{}");
            if (Event)
            {
                Event->Broadcast(Connected && Status >= 200 && Status < 300, Status, Json);
            }
        }
    );

    Request->ProcessRequest();
}
