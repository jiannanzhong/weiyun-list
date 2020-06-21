<?php

namespace ctCloud\app\exception;


class ReqParamMandatoryException extends InvalidReqException
{
    public function __construct($msg)
    {
        parent::__construct('param `' . $msg . '` is mandatory');
    }
}