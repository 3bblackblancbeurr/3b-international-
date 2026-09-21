#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "ThreeBWorldBridgeSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(
    FThreeBBridgeReady,
    const FString&, UserId,
    const FString&, PassportId,
    const FString&, Country,
    int32, WorldRevision
);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FThreeBBridgeError, const FString&, Message);

UCLASS()
class THREEBWORLD_API UThreeBWorldBridgeSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable, Category="3B|Bridge")
    FThreeBBridgeReady OnBridgeReady;

    UPROPERTY(BlueprintAssignable, Category="3B|Bridge")
    FThreeBBridgeError OnBridgeError;

    UFUNCTION(BlueprintCallable, Category="3B|Bridge")
    void ConfigureApiBase(const FString& InApiBase);

    UFUNCTION(BlueprintCallable, Category="3B|Bridge")
    void RedeemLaunchTicket(const FString& Ticket, const FString& DeviceId);

    UFUNCTION(BlueprintPure, Category="3B|Bridge")
    bool HasWorldSession() const { return !SessionToken.IsEmpty(); }

    UFUNCTION(BlueprintPure, Category="3B|Bridge")
    FString GetAuthenticatedUserId() const { return UserId; }

    UFUNCTION(BlueprintPure, Category="3B|Bridge")
    FString GetPassportId() const { return PassportId; }

    UFUNCTION(BlueprintPure, Category="3B|Bridge")
    FString GetCountry() const { return Country; }

    UFUNCTION(BlueprintPure, Category="3B|Bridge")
    int32 GetWorldRevision() const { return WorldRevision; }

    UFUNCTION(BlueprintPure, Category="3B|Bridge")
    FString GetBootstrapWorldJson() const { return BootstrapWorldJson; }

private:
    FString ApiBase;
    FString SessionToken;
    FString UserId;
    FString PassportId;
    FString Country;
    FString BootstrapWorldJson;
    int32 WorldRevision = 0;

    void Fail(const FString& Message);
};
