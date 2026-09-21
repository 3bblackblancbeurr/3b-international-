#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "GameplayTagContainer.h"
#include "ThreeBGameState.generated.h"

USTRUCT(BlueprintType)
struct FThreeBReplicatedStoryState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FName SliceId;

    UPROPERTY(BlueprintReadOnly)
    FName PhaseId;

    UPROPERTY(BlueprintReadOnly)
    FGameplayTag WorldStateTag;

    UPROPERTY(BlueprintReadOnly)
    int32 Revision = 0;

    UPROPERTY(BlueprintReadOnly)
    bool bGuardianLiberated = false;

    bool operator==(const FThreeBReplicatedStoryState& Other) const
    {
        return SliceId == Other.SliceId
            && PhaseId == Other.PhaseId
            && WorldStateTag == Other.WorldStateTag
            && Revision == Other.Revision
            && bGuardianLiberated == Other.bGuardianLiberated;
    }
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FThreeBStoryStateChanged, FThreeBReplicatedStoryState, StoryState);

UCLASS()
class THREEBWORLD_API AThreeBGameState : public AGameStateBase
{
    GENERATED_BODY()

public:
    AThreeBGameState();

    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    UFUNCTION(BlueprintPure, Category="3B|Story")
    FThreeBReplicatedStoryState GetStoryState() const { return StoryState; }

    UPROPERTY(BlueprintAssignable, Category="3B|Story")
    FThreeBStoryStateChanged OnStoryStateChanged;

    // C++ server path only. This is deliberately not exposed as a client RPC or Blueprint mutation.
    bool ApplyAuthoritativeStoryState(const FThreeBReplicatedStoryState& NewState);

protected:
    UPROPERTY(ReplicatedUsing=OnRep_StoryState, BlueprintReadOnly, Category="3B|Story")
    FThreeBReplicatedStoryState StoryState;

    UFUNCTION()
    void OnRep_StoryState();
};
