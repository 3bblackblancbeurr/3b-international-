// Reference contract only. The Foundation Kit remains engine-agnostic.
using System;
using UnityEngine;

namespace ThreeB.BeyondReal.XR
{
    [Flags]
    public enum SpatialCapability
    {
        None = 0,
        Planes = 1 << 0,
        RoomMesh = 1 << 1,
        SemanticLabels = 1 << 2,
        Anchors = 1 << 3,
        PersistentAnchors = 1 << 4,
        Passthrough = 1 << 5,
        Hands = 1 << 6,
        Controllers = 1 << 7,
        EyeTracking = 1 << 8,
        BodyTracking = 1 << 9,
        SpatialAudio = 1 << 10,
    }

    [Serializable]
    public struct SpatialPose
    {
        public Vector3 position;
        public Quaternion rotation;
    }

    public interface ISpatialRoomService
    {
        SpatialCapability Capabilities { get; }
        bool TryGetRoom(out object roomSnapshot);
    }

    public interface IAnchorService
    {
        bool TryCreateAnchor(string logicalObjectId, SpatialPose pose, out string anchorReference);
        bool TryResolveAnchor(string anchorReference, out SpatialPose pose);
        bool TryRemoveAnchor(string anchorReference);
    }

    public interface IPassthroughService
    {
        bool IsAvailable { get; }
        void SetEnabled(bool enabled);
    }

    public interface ISpatialSafetyService
    {
        bool IsPoseSafe(SpatialPose pose, Vector3 requiredExtents);
    }
}
