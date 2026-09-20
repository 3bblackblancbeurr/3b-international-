#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "ThreeBBackendSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FThreeBBackendResponse, bool, Success, int32, StatusCode, const FString&, Json);

UCLASS()
class THREEBWORLD_API UThreeBBackendSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable, Category="3B|Backend")
    FThreeBBackendResponse OnWorldResponse;

    UPROPERTY(BlueprintAssignable, Category="3B|Backend")
    FThreeBBackendResponse OnCityResponse;

    UFUNCTION(BlueprintCallable, Category="3B|Backend")
    void ConfigurePublicBackend(const FString& InBaseUrl, const FString& InPublishableKey);

    UFUNCTION(BlueprintCallable, Category="3B|Backend")
    void SetUserAccessToken(const FString& InAccessToken);

    UFUNCTION(BlueprintPure, Category="3B|Backend")
    bool HasAuthenticatedSession() const;

    UFUNCTION(BlueprintCallable, Category="3B|Backend")
    void SendWorldCommands(const FString& DeviceId, const FString& CommandsJson);

    UFUNCTION(BlueprintCallable, Category="3B|Backend")
    void RequestCitySnapshot();

private:
    FString BaseUrl;
    FString PublishableKey;
    FString AccessToken;

    void SendJsonPost(const FString& Path, const FString& Body, FThreeBBackendResponse* Event);
};
