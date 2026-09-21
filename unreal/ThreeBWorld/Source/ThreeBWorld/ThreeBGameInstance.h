#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "ThreeBGameInstance.generated.h"

UCLASS(Config=Game)
class THREEBWORLD_API UThreeBGameInstance : public UGameInstance
{
    GENERATED_BODY()

public:
    virtual void Init() override;

private:
    UPROPERTY(Config)
    FString DefaultApiBase;

    static FString QueryValue(const FString& Url, const FString& Key);
};
