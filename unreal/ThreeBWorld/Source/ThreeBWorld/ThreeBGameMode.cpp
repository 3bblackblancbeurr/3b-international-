#include "ThreeBGameMode.h"

#include "ThreeBCharacter.h"
#include "ThreeBPlayerState.h"

AThreeBGameMode::AThreeBGameMode()
{
    DefaultPawnClass = AThreeBCharacter::StaticClass();
    PlayerStateClass = AThreeBPlayerState::StaticClass();
}
