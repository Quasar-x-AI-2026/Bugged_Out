package com.example.buggedout.DomainLayer.util

sealed class Results<out T> {
    data object Idle : Results<Nothing>()
    data object Loading : Results<Nothing>()
    data class Success<out T>(val data : T): Results<T>()
    data class Failure(val message: String): Results<Nothing>()
}