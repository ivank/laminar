# Laminar Example: comms

An api that holds some state for an external email api.

When we need to send a comm, it will hit the external email api's rest endpoint, and wait for the kafka feedback to arrive that will set its state to "Delivered"
